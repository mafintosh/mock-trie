const Reference = require('./reference')
const Trie = require('.')

const KEY_CHARACTERS = 'abcd'
const VALUE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz'

module.exports = {
  setup,
  operations,
  validation
}

async function setup () {
  const reference = new Reference()
  const trie = new Trie()
  return {
    reference,
    actual: trie,
    state: null
  }
}

class Inputs {
  constructor (rng, opts = {}) {
    this.generator = rng
    this._maxComponentLength = opts.maxComponentLength
    this._maxPathDepth = opts.maxPathDepth
  }

  _randomString (alphabet, length) {
    var s = ''
    for (let i = 0; i < length; i++) {
      s += alphabet[this.generator(alphabet.length) || 1]
    }
    return s
  }

  _relativeSymlink () {
    var { path } = this._kvPair()
    path = path.split('/')
    const numRelativeIndexes = this.generator(path.length / 2 + 1)
    const relativeIndexes = new Array(numRelativeIndexes).fill(0).map(() => this.generator(path.length + 1))
    for (const index of relativeIndexes) {
      path.splice(index, 0, '..')
    }
    return path.join('/')
  }

  _absoluteSymlink () {
    var { path } = this._kvPair()
    return path
  }

  _kvPair () {
    const depth = this.generator(this._maxPathDepth + 1) || 1
    const value = this._randomString(VALUE_CHARACTERS, 10)
    const path = new Array(depth).fill(0).map(() => {
      const length = this.generator(this._maxComponentLength + 1) || 1
      return this._randomString(KEY_CHARACTERS, length)
    })
    return { path: path.join('/'), value }
  }

  _symlink () {
    const absolute = !!this.generator(2)
    const { path: linkname } = this._kvPair()
    var target = !absolute ? this._relativeSymlink() : this._absoluteSymlink()
    if (absolute) target = '/' + target
    return { linkname, target }
  }

  put () {
    const { path, value } = this._kvPair()
    return [path, value]
  }

  rename () {
    const { path: from } = this._kvPair()
    const { path: to } = this._kvPair()
    return [from, to]
  }

  symlink () {
    const { linkname, target} = this._symlink()
    return [target, linkname]
  }

  delete () {
    const { path } = this._kvPair()
    return [path]
  }
}

class Operations {
  constructor (reference, actual, opts = {}) {
    this.reference = reference
    this.actual = actual
    this.opts = opts
  }

  put (path, value) {
    this.reference.put(path, value)
    return this.actual.put(path, value)
  }

  rename (from, to) {
    this.reference.rename(from, to)
    return this.actual.rename(from, to)
  }

  symlink (target, linkname) {
    this.reference.symlink(target, linkname)
    return this.actual.symlink(target, linkname)
  }

  delete (path, opts) {
    this.reference.delete(path)
    return this.actual.del(path)
  }
}

class Validators {
  constructor (generator, inputs, reference, actual, opts = {}) {
    console.log('opts in validators:', opts)
    this.generator = generator
    this.inputs = inputs
    this.reference = reference
    this.actual = actual
    this.opts = opts
  }

  _getError (actualKey, expectedKey, actualValue, expectedValue) {
    const error = new Error(`getting key ${expectedKey} to return ${expectedValue}`)
    error.mismatch = { actualKey, expectedKey, actualValue, expectedValue}
    throw error
  }

  _iteratorError (message, prefix, opts, actualNodes, expectedNodes) {
    const error = new Error(message)
    error.mismatch = { actualNodes, expectedNodes, prefix, opts}
    throw error
  }

  async sameNodes (path) {
    const expectedNode = this.reference.get(path)
    const actualNode = await this.actual.get(path)

    const expectedKey = path
    const expectedValue = expectedNode ? expectedNode.value : null
    const actualValue = actualNode ? actualNode.value.value : null
    if (!expectedValue && !actualValue) return

    if (!actualValue) return this._getError(null, path, null, expectedValue)
    if (!expectedValue) return this._getError(actualNode.key, path, actualValue, null)

    if (!actualValue && !expectedValue) return
    if (!expectedValue) return this._getError(actualNode.key, path, actualValue, null)

    if (actualNode.key !== path || actualValue !== expectedValue) {
      return this._getError(actualNode.key, path, actualValue, expectedValue)
    }
  }

  async sameIterators (path, opts) {
    const self = this
    const gt = !!opts.gt
    const recursive = !!opts.recursive
    console.log('in sameIterators, path:', path, 'gt:', gt, 'recursive:', recursive)

    const expectedIterator = this.reference.iterator(path, { gt, recursive})
    const actualIterator = this.actual.iterator(path, { gt, recursive })
    var expectedNodes = await all(expectedIterator)
    var actualNodes = await all(actualIterator)
    console.log('actualNodes:', actualNodes, 'expectedNodes:', expectedNodes)

    const expectedMap = buildMap(expectedNodes.map(({ key, node }) => [path, node]))
    const actualMap = buildMap(actualNodes.map(node => [node.key, node]))

    for (const [key, value] of actualMap) {
      if (!expectedMap.get(key)) {
        const message = `iterator should not return unexpected key ${key}`
        return this._iteratorError(message, path, opts, actualNodes, expectedNodes)
      }
      expectedMap.delete(key)
    }
    if (expectedMap.size) {
      const message = `iterator should return ${expectedMap.size} keys`
      return this._iteratorError(message, path, opts, actualNodes, expectedNodes)
    }

    function buildMap (nodes) {
      console.log('building map of nodes:', nodes)
      const m = new Map()
      for (const [key, node] of nodes) {
        if (m.get(key)) {
          const message = `iterator should not return duplicate key ${key}`
          return self._iteratorError(message, path, opts, actualNodes, expectedNodes)
        }
        m.set(key, node)
      }
      return m
    }

    function all (iterator) {
      const values = []
      return new Promise((resolve, reject) => {
        iterator.next(function onnext (err, value) {
          if (err) return reject(err)
          if (!value) return resolve(values)
          values.push(value)
          return iterator.next(onnext)
        })
      })
    }
  }

  reachable (test) {
    return this.reference.map(async (path, node, target) => {
      return test(path)
    })
  }

  async syntheticKeys (test) {
    const numKeys = this.opts.syntheticKeys.keys
    for (let i = 0; i < numKeys; i++) {
      const [ path ] = this.inputs.put()
      await test(path)
    }
  }

  async iterators (test) {
    const numKeys = this.opts.iterators.keys
    for (let i = 0; i < numKeys; i++) {
      const [ path ] = this.inputs.put()
      const gt = !!this.generator(2) && this.opts.iterators.canBeGT
      const recursive = !!this.generator(2) && this.opts.iterators.canBeRecursive
      await test(path, { gt, recursive })
    }
  }
}

function operations (reference, actual, rng, opts = {}) {
  const inputs = new Inputs(rng, opts.inputs)
  const ops = new Operations(reference, actual)
  return {
    put: {
      inputs: inputs.put.bind(inputs),
      operation: ops.put.bind(ops)
    },
    rename: {
      inputs: inputs.rename.bind(inputs),
      operation: ops.rename.bind(ops)
    },
    symlink: {
      inputs: inputs.symlink.bind(inputs),
      operation: ops.symlink.bind(ops)
    },
    delete: {
      inputs: inputs.delete.bind(inputs),
      operation: ops.delete.bind(ops)
    }
  }
}

function validation (reference, actual, rng, opts = {}) {
  const inputs = new Inputs(rng, opts.inputs)
  const validators = new Validators(rng, inputs, reference, actual, opts.validation)
  return {
    tests: {
      sameNodes: validators.sameNodes.bind(validators),
      sameIterators: validators.sameIterators.bind(validators)
    },
    validators: {
      reachable: {
        operation: validators.reachable.bind(validators),
        test: 'sameNodes'
      },
      syntheticKeys: {
        operation: validators.syntheticKeys.bind(validators),
        test: 'sameNodes'
      },
      iterators: {
        operation: validators.iterators.bind(validators),
        test: 'sameIterators'
      }
    }
  }
}