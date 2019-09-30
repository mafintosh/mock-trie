const test = require('tape')
const util = require('util')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')

const KEY_CHARACTERS = 'abcd'
const VALUE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz'

class TrieNode {
  constructor (key, value, opts = {}) {
    this.key = key
    this.value = value
    this.symlink = !!opts.symlink
    this.children = new Map()
  }
}

class ReferenceTrie {
  constructor (generator) {
    this.generator = generator
    this.root = new TrieNode('')
  }

  find (path, opts = {}) {
    let node = this.root
    let visited = opts.visited || new Set()
    for (let i = 0; i < path.length; i++) {
      if (visited.has(node.key)) return null
      let next = node.children.get(path[i])
      if (next && next.symlink) return this.visit(next.value, opts)
      if (opts.put) {
        if (!next) {
          next = new TrieNode(path[i], null, opts)
          node.children.set(path[i], next)
        }
        if (i === path.length - 1) {
          next.value = opts.put
        }
      }
      node = next
    }
    return node
  }

  async map (fn) {
    const visited = new Set()
    const stack = [{ path: '', node: this.root }]
    while (stack.length) {
      const { path, node } = stack.pop()
      if (visited.has(path)) continue
      visited.add(path)
      if (node.value) {
        await fn(path, node)
      }
      for (let [key, child] of node.children) {
        stack.push({ path: ((path === '') ? '' : path + '/') + key, node: child })
      }
    }
  }

  put (path, value, opts) {
    // console.log('**** BEFORE PUT, path:', path, 'value:', value, 'trie:', this.root)
    this.find(path, { put: value })
    // console.log('==== AFTER PUT, this.root:', this.root)
  }

  symlink (targetPath, linknamePath) {
    this.put(linknamePath, targetPath, { symlink: true })
  }

  rename (fromPath, toPath) {
    const fromBucket = this._get(fromPath)
    if (!fromBucket || !(fromBucket instanceof Map)) return
    const toBucket = this._createBucket(toPath, { create: true })
    toBucket.set(fromPath[fromPath.length - 1], new Map([ ...fromBucket ]))
    fromBucket.clear()
  }

  validate (other) {
    return this.map(async (path, node) => {
      const otherNode = await other.get(path)
      if (!otherNode) return error(path, null, node.value, null)
      const otherValue = JSON.parse(otherNode.value).value
      if (otherNode.key !== path || otherValue !== node.value) {
        console.log('path:', path, 'otherNode:', otherNode, 'node:', node)
        return error(otherNode.key, path, otherValue, node.value)
      }
    })

    function error (key, refKey, value, refValue) {
      const errString = `Validation failed for: Reference: ${refKey} -> ${refValue}, Trie: ${key} -> ${value}`
      throw new Error(errString)
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

    this.add(2, this.putNormalValue)
    // this.add(1, this.createSymlink)
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
    this.reference.put(path, value)
  }

  async createSymlink () {
    const { path: linknamePath } = this._generatePair()
    const { path: targetPath } = this._generatePair()
    const linkname = linknamePath.join('/')
    const target = targetPath.join('/')

    // Do not create circular symlinks
    if (linkname.startsWith(target)) return

    this.debug('creating symlink:', linkname, '->', target)
    await this.trie.symlink(target, linkname)
    this.reference.symlink(targetPath, linknamePath)
  }

  async rename () {
    const { path: toPath } = this._generatePair()
    const { path: fromPath } = this._generatePair()
    const to = toPath.join('/')
    const from = fromPath.join('/')

    this.debug('renaming:', from, '->', to)
    await this.trie.rename(from, to)
    this.reference.rename(fromPath, toPath)
  }

  async _validate () {
    this.debug('validating against reference:\n', await this.reference.print())
    return this.reference.validate(this.trie)
  }
}

function run () {
  const numTests = 50000

  test(`${numTests} fuzz operations`, async t => {
    t.plan(1)

    const fuzz = new TrieFuzzer({
      seed: 'hypertrie',
      debugging: true,
      maxComponentLength: 5,
      maxPathDepth: 10
    })

    try {
      await fuzz.run(numTests)
      t.pass('fuzzing succeeded')
    } catch (err) {
      t.error(err, 'no error')
    }
  })
}

run()

function randomString (alphabet, generator, length) {
  var s = ''
  for (let i = 0; i < length; i++) {
    s += alphabet[generator(alphabet.length) || 1]
  }
  return s
}
