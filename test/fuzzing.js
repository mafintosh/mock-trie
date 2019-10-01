const test = require('tape')
const util = require('util')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')

const KEY_CHARACTERS = 'abcd'
const VALUE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz'

class TrieNode {
  constructor (key, value, opts = {}) {
    this.value = value
    this.symlink = !!opts.symlink
    this.children = new Map()
  }

  [util.inspect.custom] (depth, opts) {
    const lvl = (opts && opts.indentationLvl) || 0
    const indent = ' '.repeat(lvl)
    return indent + 'TrieNode(\n'
      + indent + '  symlink: ' + this.symlink + '\n'
      + indent + '  value: ' + (this.value ? this.value.toString() : null) + '\n'
      + indent + '  children: ' + [...this.children.keys()].join(',') + '\n'
      + indent + ')'
  }
}

class ReferenceTrie {
  constructor (generator) {
    this.generator = generator
    this.root = new TrieNode('')
  }

  find (node, path, opts = {}) {
    if (!node && opts.put) node = new TrieNode(path[0], null)
    if (!node) return null

    const fullPath = opts.fullPath || ''

    opts.visited = opts.visited || new Set()
    if (opts.visited.has(fullPath)) return null
    opts.visited.add(fullPath)

    if (!path.length) {
      if (opts.put) {
        node.value = opts.put
        node.symlink = !!opts.symlink
        node.children = new Map()
        return node
      }
      if (node.symlink) return this.find(this.root, node.value, { ...opts })
      return node
    }

    const nextPath = fullPath ? fullPath + '/' + path[0] : path[0]
    var child = (node.symlink) ? this.find(this.root, node.value, { ...opts }) : node.children.get(path[0])
    if (opts.put) {
      if (!child) child = new TrieNode(path[0], null)
      node.children.set(path[0], child)
    }
    return this.find(child, path.slice(1), { ...opts, fullPath: nextPath })
  }

  async map (fn) {
    const visited = new Set()
    const stack = [{ path: '', node: this.root }]
    while (stack.length) {
      const { path, node } = stack.pop()
      if (!node) continue

      if (visited.has(path)) continue
      visited.add(path)

      if (node.symlink) {
        const target = this.find(this.root, node.value)
        stack.push({ path: node.value.join('/'), node: target })
        await fn(path, node, target)
        continue
      }
      if (node.value) {
        await fn(path, node)
      }
      for (let [key, child] of node.children) {
        stack.push({ path: ((path === '') ? '' : path + '/') + key, node: child })
      }
    }
  }

  put (path, value, opts) {
    this.find(this.root, path, { ...opts, put: value })
  }

  symlink (targetPath, linknamePath) {
    this.put(linknamePath, targetPath, { symlink: true, debug: true })
  }

  rename (fromPath, toPath) {
    const fromBucket = this._get(fromPath)
    if (!fromBucket || !(fromBucket instanceof Map)) return
    const toBucket = this._createBucket(toPath, { create: true })
    toBucket.set(fromPath[fromPath.length - 1], new Map([ ...fromBucket ]))
    fromBucket.clear()
  }

  validate (other) {
    return this.map(async (path, node, target) => {
      const expectedValue = node.symlink ? (target && target.value) : (node && node.value)
      const otherNode = await other.get(path)
      if (!expectedValue && !otherNode) return
      if (!otherNode) return error(null, path, null, node.value)
      const otherValue = otherNode.value.value
      if (!expectedValue) return error(otherNode.key, path, otherValue, null)
      if (otherNode.key !== path || otherValue !== expectedValue) {
        return error(otherNode.key, path, otherValue, expectedValue)
      }
    })

    function error (key, expectedKey, value, expectedValue) {
      const error = new Error('Found a key/value mismatch.')
      error.mismatch = { key, expectedKey, value, expectedValue }
      throw error
    }
  }

  async print (opts = {}) {
    const lvl = opts.indentationLvl || 0
    const indent = ' '.repeat(lvl)
    var s = '\n' + indent + 'ReferenceTrie(' + '\n'
    await this.map((path, node) => {
      if (!node.symlink) s += indent + '  ' + path + ' => ' + node.value + '\n'
      else s += indent + '  ' + path + ' => (symlink) ' + node.value.join('/') + '\n'
    })
    s += indent + ')\n'
    return s
  }
}

class TrieFuzzer extends FuzzBuzz {
  constructor (opts) {
    super(opts)

    this.trie = new Trie()
    this.reference = new ReferenceTrie(this.randomInt.bind(this))
    this._maxComponentLength = opts.maxComponentLength || 10
    this._maxPathDepth = opts.maxPathDepth || 10

    // TODO: Hack for simple code generation.
    this._trace = [
      'const trie = new Trie()',
      ''
    ]

    this.add(2, this.putNormalValue)
    this.add(1, this.createSymlink)
    // this.add(1, this.rename)
  }

  _generatePair () {
    const generator = this.randomInt.bind(this)
    const depth = this.randomInt(this._maxPathDepth) || 1
    const value = randomString(VALUE_CHARACTERS, generator, 10)
    const path = new Array(depth).fill(0).map(() => {
      const length = this.randomInt(this._maxComponentLength) || 1
      return randomString(KEY_CHARACTERS, generator, length)
    })
    return { path, value }
  }

  async putNormalValue () {
    const { path, value } = this._generatePair()
    const key = path.join('/')
    this.debug('putting normal key/value:', key, '->', value)
    await this.trie.put(key, value)
    this._trace.push(`await trie.put(\'${key}\', \'${value}\')`)
    this.reference.put(path, value)
  }

  async createSymlink () {
    const { path: linknamePath } = this._generatePair()
    const { path: targetPath } = this._generatePair()
    const linkname = linknamePath.join('/')
    const target = targetPath.join('/')

    // Do not create circular symlinks
    if (linkname.startsWith(target) || target.startsWith(linkname)) return

    this.debug('creating symlink:', linkname, '->', target)
    await this.trie.symlink(target, linkname)
    this._trace.push(`await trie.symlink(\'${target}\', \'${linkname}\')`)
    this.reference.symlink(targetPath, linknamePath)
  }

  async rename () {
    const { path: toPath } = this._generatePair()
    const { path: fromPath } = this._generatePair()
    const to = toPath.join('/')
    const from = fromPath.join('/')

    this.debug('renaming:', from, '->', to)
    await this.trie.rename(from, to)

    // this.trace('await trie.rename(%o, %o)', from, to)
    this._trace.push(`await trie.rename(\'${from}\', \'${to}\')`)

    this.reference.rename(fromPath, toPath)
  }

  async _validate () {
    this.debug('validating against reference:\n', await this.reference.print())
    try {
      await this.reference.validate(this.trie)
      return null
    } catch (err) {
      if (!err.mismatch) throw err
      const { key, value, expectedKey, expectedValue } = err.mismatch
      this._trace.push(...[
        '',
        `// Should return ${expectedKey} -> ${expectedValue}`,
        `// Actually returns ${key} -> ${value}`,
        `const node = await trie.get('${key}')`,
        `const value = node.value ? node.value.value : null`,
        `t.same(value, ${expectedValue ? `'${expectedValue}'` : null})`,
        `t.end()`
      ])
      const requires = 'const test = require(\'tape\')\nconst Trie = require(\'../trie\')\n\n'
      const testCase = `${requires}test(\'failing autogenerated test case\', async t => {\n  ${this._trace.join('\n  ')} \n})`
      err.testCase = testCase
      throw err
    }
  }
}

function run (numTests, numOperations) {
  test(`${numTests} runs with ${numOperations} fuzz operations each`, async t => {
    var error = null
    try {
      for (let i = 0; i < numTests; i++) {
        const fuzz = new TrieFuzzer({
          seed: `hypertrie-${i}`,
          debugging: true,
          maxComponentLength: 5,
          maxPathDepth: 3
        })
        await fuzz.run(numOperations)
      }
    } catch (err) {
      error = err
      t.fail(error)
      if (error.testCase) {
        console.error('Failing Test:\n')
        console.error(error.testCase)
        console.error()
      }
    }
    if (error) t.fail('fuzzing failed')
    else t.pass('fuzzing succeeded')
    t.end()
  })
}

run(1000, 5)

function randomString (alphabet, generator, length) {
  var s = ''
  for (let i = 0; i < length; i++) {
    s += alphabet[generator(alphabet.length) || 1]
  }
  return s
}
