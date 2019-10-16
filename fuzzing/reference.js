const util = require('util')

const {
  resolveLink,
  linkContains
} = require('../lib/paths')

const MAX_SYMLINK_DEPTH = 20

class TrieNode {
  constructor (key, value, opts = {}) {
    this.value = value
    this.symlink = opts.symlink
    this.children = new Map()
  }

  clone () {
    const c = new TrieNode(null, this.value, { symlink: this.symlink })
    for (const [ key, node ] of this.children) {
      c.children.set(key, node.clone())
    }
    return c
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

module.exports = class ReferenceTrie {
  constructor () {
    this.root = new TrieNode('')
  }

  _put (path, node, opts = {}) {
    if (!Array.isArray(path)) throw new Error('Path must always be an array.')
    if (!path.length) return finalize(node)

    // if (node && node.symlink && opts.lstat && path.length === 1) return finalize(node)

    const target = opts.target || path.join('/')
    const key = opts.key ? opts.key + '/' + path[0] : path[0]
    const linkDepth = opts.linkDepth || 0

    var next = node.children.get(path[0])
    const followLink = !opts.lstat || path.length !== 1
    if (!next) next = new TrieNode(path[0])
    node.children.set(path[0], next)

    if (next.symlink && opts.lstat && path.length === 1) return finalize(next)

    if (next.symlink) {
      if (linkDepth > MAX_SYMLINK_DEPTH) return null

      var linkTarget = next.symlink.target
      if (next.symlink.absolute) linkTarget = '/' + linkTarget
      const resolved = resolveLink(target, key, linkTarget)

      if (key === target) return finalize(next)

      return this._put(toPath(resolved), this.root, {
        ...opts,
        linkDepth: linkDepth + 1,
        target: resolved,
        key: null
      })
    }

    return this._put(path.slice(1), next, {
      ...opts,
      linkDepth,
      target,
      key
    })

    function finalize (node) {
      if (opts.delete) {
        node.value = null
        node.symlink = null
        node.children = new Map()
      } else {
        if (opts.value) {
          node.value = opts.value
          node.symlink = null
        } else if (opts.symlink) {
          node.symlink = opts.symlink
          node.value = null
        }
        if (opts.children) node.children = opts.children
      }
      return node
    }
  }

  _get (path, node, opts = {}) {
    if (!Array.isArray(path)) throw new Error('Path must always be an array.')
    const component = path[0] ? path[0] : ''
    var key = opts.key ? opts.key + '/' + component : component

    if (!path.length) return finalize(node)
    if (!node) return finalize(null)

    var target = opts.target || path.join('/')
    var linkDepth = opts.linkDepth || 0

    var next = node.children.get(path[0])
    if (!next) return finalize(null)

    if (opts.lstat && next.symlink && path.length === 1) return finalize(next)

    if (next.symlink) {
      if (linkDepth > MAX_SYMLINK_DEPTH) {
        key = null
        return finalize(null) 
      }

      var linkTarget = next.symlink.target
      if (next.symlink.absolute) linkTarget = '/' + linkTarget
      const resolved = resolveLink(target, key, linkTarget)

      return this._get(toPath(resolved), this.root, {
        ...opts,
        linkDepth: linkDepth + 1,
        target: resolved,
        key: null
      })
    }

    return this._get(path.slice(1), next, {
      ...opts,
      linkDepth,
      target,
      key
    })

    function finalize (node) {
      if (key === null) return { node: null, key: null}
      const finalKey = path.length ? key + '/' + path.slice(1).join('/') : key
      return {
        node: node || null,
        key: finalKey
      }
    }
  }

  _rename (fromNodePath, toNodePath) {
    const { node: from, key: fromKey } = this._get(fromNodePath, this.root, { lstat: true })
    const { key: toKey } = this._get(toNodePath, this.root, { lstat: true })

    const resolvedToPath = toKey && toPath(toKey)
    const resolvedFromPath = fromKey && toPath(fromKey)
    const clone = from && from.clone()

    // Always implicitly delete the target, even if we hit circular links
    if (resolvedToPath) this._put(resolvedToPath, this.root, { delete: true, lstat: true })
    if (toKey === null || fromKey === null) return

    this._put(resolvedFromPath, this.root, { delete: true, lstat: true })
    if (from) this._put(resolvedToPath, this.root, { ...clone, lstat: true })
  }

  async map (fn) {
    const visited = new Set()
    const stack = [{ depth: 0, path: '', node: this.root }]
    while (stack.length) {
      const { depth, path, node } = stack.pop()
      if (!node || depth > MAX_SYMLINK_DEPTH) continue

      if (visited.has(node)) continue
      visited.add(node)

      if (node.symlink) {
        const targetKey = node.symlink.absolute ? '/' + node.symlink.target : node.symlink.target
        const resolved = resolveLink(path, path, targetKey)
        const target = this.get(resolved)
        await fn(path, node, target)
        continue
      }
      if (node.value) {
        await fn(path, node)
      }
      for (let [key, child] of node.children) {
        stack.push({ depth, path: ((path === '') ? '' : path + '/') + key, node: child })
      }
    }
  }

  put (path, value, opts = {})  {
    if (typeof path === 'string') path = toPath(path)

    const key = path.join('/')
    const debug = true

    this._put(path, this.root, { ...opts, value, lstat: true, debug })
  }

  get (path, opts = {}) {
    if (!path) return null
    if (typeof path === 'string') path = toPath(path)

    const key = path.join('/')
    const debug = key === 'dc/bdc/bbb'

    const { node } = this._get(path, this.root, { ...opts, debug})
    return node
  }

  delete (path, opts = {}) {
    if (typeof path === 'string') path = toPath(path)

    const key = path.join('/')
    const debug = false

    return this._put(path, this.root, { ...opts, delete: true, lstat: true, debug})
  }

  rename (from, to, opts = {}) {
    if (from === to) return
    if (typeof from === 'string') from = toPath(from)
    if (typeof to === 'string') to = toPath(to)

    const debug = false

    return this._rename(from, to, { ...opts, debug})
  }

  symlink (target, linkname, absolute) {
    if (typeof target !== 'string') target = fromPath(target)
    const linknamePath = (typeof linkname === 'string') ? toPath(linkname) : linkname

    // Do not create self-links or links to subdirectories.
    if (linkContains(linkname, target)) return null

    this.delete(linkname)
    return this.put(linknamePath, null, { symlink: { target, absolute }, lstat: true })
  }

  _error (actualKey, expectedKey, actualValue, expectedValue) {
    const error = new Error('Found a key/value mismatch.')
    error.mismatch = { actualKey, expectedKey, actualValue, expectedValue }
    throw error
  }

  _validate (path, expectedNode, actualNode) {
    const expectedKey = path
    const expectedValue = expectedNode ? expectedNode.value : null
    const actualValue = actualNode ? actualNode.value.value : null
    if (!expectedValue && !actualValue) return

    if (!actualValue) return this._error(null, path, null, expectedValue)
    if (!expectedValue) return this._error(actualNode.key, path, actualValue, null)

    if (!actualValue && !expectedValue) return
    if (!expectedValue) return this._error(actualNode.key, path, actualValue, null)

    if (actualNode.key !== path || actualValue !== expectedValue) {
      return this._error(actualNode.key, path, actualValue, expectedValue)
    }
  }

  async validatePath (path, other) {
    const key = (typeof path === 'string') ? path : path.join('/')
    const debug = key === 'd/cb'
    const expectedNode = this.get(path, { debug })
    const actualNode = await other.get(key)
    return this._validate(key, expectedNode, actualNode)
  }

  validateAllReachable (other) {
    return this.map(async (path, node, target) => {
      const expectedNode = node.symlink ? target : node
      const otherNode = await other.get(path)
      return this._validate(path, expectedNode, otherNode)
    })
  }

  async print (opts = {}) {
    const lvl = opts.indentationLvl || 0
    const indent = ' '.repeat(lvl)
    var s = '\n' + indent + 'ReferenceTrie(' + '\n'
    await this.map((path, node) => {
      if (!node.symlink) {
        s += indent + '  ' + path + ' => ' + node.value + '\n'
      }
      else {
        s += indent + '  ' + path + ' => (symlink) ' + node.symlink.target + '\n'
      }
    })
    s += indent + ')\n'
    return s
  }
}

function toPath (str) {
  var path = str.split('/')
  if (!path[0]) path = path.slice(1)
  if (!path[path.length - 1]) path = path.slice(0, -1)
  return path
}

function fromPath (path) {
  return path.join('/')
}

function startsWith (a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}