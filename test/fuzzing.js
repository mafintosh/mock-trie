const test = require('tape')
const util = require('util')
const SandboxPath = require('sandbox-path')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')
const path = new SandboxPath('/')

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

  _traverse (path, node, handlers = {}, state = {}) {
    state.visited = state.visited || new Set()
    const fullPath = state.fullPath || ''

    if (state.debug) console.log('VISITED CHECK:', fullPath, state.visited)
    if (fullPath && state.visited.has(fullPath)) return null
    if (state.debug) console.log('NOT VISITED')
    state.visited.add(fullPath)

    if (!path.length) {
      if (handlers.onfinal) node = handlers.onfinal(fullPath, node, state)
      return node
    }

    let next = node && node.children.get(path[0])
    if (next && next.symlink) {
      if (state.debug) console.log('TRAVERSING INTO SYMLINK:', next.value)
      next = this._traverse(next.value, this.root, {}, { visited: state.visited, debug: state.debug })
      if (state.debug) console.log('TRAVERSING RESULT:', next)
    }
    if (handlers.onnode) next = handlers.onnode(fullPath, path[0], node, next, state)
    if (state.debug) console.log('TRAVERSE NEXT:', next)

    const nextPath = fullPath ? fullPath + '/' + path[0] : path[0]
    return this._traverse(path.slice(1), next, handlers, { ...state, fullPath: nextPath })
  }

  _put (path, value, opts = {}) {
    this._traverse(path, this.root, {
      onnode: (fullPath, component, node, next, state) => {
        if (opts.debug) console.log('PUT ONNODE, fullPath:', fullPath, 'component:', component, 'node:', node)
        if (!next) next = new TrieNode(component, null)
        node.children.set(component, next)
        return next
      },
      onfinal: (fullPath, node, state) => {
        if (opts.debug) console.log('PUT ONFINAL, fullPath:', fullPath, 'node:', node)
        if (!node) node = new TrieNode(null, value, opts)
        node.value = value
        node.symlink = !!opts.symlink
        return node
      }
    }, { debug: opts.debug })
  }

  _get (path, opts = {}) {
    return this._traverse(path, this.root, {
      onnode: (fullPath, component, node, next, state) => {
        if (opts.debug) console.log('GET ONNODE, fullPath:', fullPath, 'component:', component, 'node:', node)
        return next
      },
      onfinal: (fullPath, node, state) => {
        if (opts.debug) console.log('GET ONFINAL, fullPath:', fullPath, 'node:', node)
        return node
      }
    }, { debug: opts.debug })
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
        const target = this.get(node.value)
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

  put (path, value, opts = {})  {
    const key = path.join('/')
    const debug = key === 'd'
    this._put(path, value, { ...opts, debug })
  }

  get (path, opts = {}) {
    const key = path.join('/')
    const debug = key === 'd'
    return this._get(path, { ...opts, debug})
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

  _error (key, expectedKey, value, expectedValue) {
    const error = new Error('Found a key/value mismatch.')
    error.mismatch = { key, expectedKey, value, expectedValue }
    throw error
  }

  _validate (path, expectedNode, actualNode) {
    const expectedValue = expectedNode ? expectedNode.value : null
    const actualValue = actualNode ? actualNode.value.value : null
    console.log('actualValue:', actualValue, 'expectedValue:', expectedValue)
    if (!expectedValue && !actualValue) return

    if (!actualValue) return this._error(null, path, null, expectedValue)
    if (!expectedValue) return this._error(actualNode.key, null, actualValue, null)

    if (!actualValue && !expectedValue) return
    if (!expectedValue) return this._error(actualNode.key, path, actualValue, null)

    if (actualNode.key !== path || actualValue !== expectedValue) {
      return this._error(actualNode.key, path, actualValue, expectedValue)
    }
  }

  async validatePath (path, other) {
    const key = path.join('/')
    const debug = key === 'd/cb'
    console.log('VALIDATING SYNTHETIC KEY:', key)
    const expectedNode = this.get(path, { debug })
    const actualNode = await other.get(key)
    return this._validate(key, expectedNode, actualNode)
  }

  validateAllReachable (other) {
    return this.map(async (path, node, target) => {
      const expectedNode = node.symlink ? target : node
      const otherNode = await other.get(path)
      console.log('VALIDATING REACHABLE KEY:', path)
      return this._validate(path, expectedNode, otherNode)
    })
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
    this._syntheticKeys = opts.syntheticKeys || 0

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

  async _validateWithSyntheticKeys (other) {
    for (let i = 0; i < this._syntheticKeys; i++) {
      const { path } = this._generatePair()
      await this.reference.validatePath(path, other)
    }
  }

  async _validate () {
    this.debug('validating against reference:\n', await this.reference.print())
    try {
      await this.reference.validateAllReachable(this.trie)
      await this._validateWithSyntheticKeys(this.trie)
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
          maxPathDepth: 3,
          syntheticKeys: 100
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

run(100, 5)

function randomString (alphabet, generator, length) {
  var s = ''
  for (let i = 0; i < length; i++) {
    s += alphabet[generator(alphabet.length) || 1]
  }
  return s
}
