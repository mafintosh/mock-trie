const { IteratorController, GetController, PutController, Node } = require('./lib/controllers')
const Hash = require('./lib/hash')
const SandboxPath = require('sandbox-path')
const MockFeed = require('mock-feed')
const nanoiterator = require('nanoiterator')
const util = require('util')

const {
  resolveLink,
  shouldFollowLink,
  linkContains,
  redirectTo
} = require('./lib/paths')

const MAX_SYMLINK_DEPTH = 20

module.exports = class Trie {
  constructor () {
    this.feed = new MockFeed()
    this.feed.append({ header: true })
  }

  iterator (prefix) {
    const self = this
    let depth = 0

    const c = new IteratorController({
      prefix,
      get (key, opts) {
        return self.get(key, { closest: true, visited: opts && opts.visited, skip: opts && opts.skip })
      },
      realpath (key) {
        const resolve = self._getPutInfo((key + '/FAKE_UNUSED_KEY').replace(/^[\/]+/, ''), {}, false)
        if (!resolve || !resolve.node) return null
        return { key: resolve.node.key.toString().replace(/(\/)?FAKE_UNUSED_KEY$/, '').trim(), depth: resolve.depth }
      }
    })
    c.setFeed(this.feed)

    const ite = nanoiterator({
      next: cb => {
        try {
          const val = c.next()
          return process.nextTick(cb, null, val)
        } catch (err) {
          return process.nextTick(cb, err)
        }
      }
    })

    return ite
  }

  get (key, opts) {
    const self = this
    let depth = 0

    const c = new GetController({
      closest: !!(opts && opts.closest),
      visited: opts && opts.visited,
      skip: opts && opts.skip,
      onclosest (node) {
        if (!node) return null

        const val = JSON.parse(node.value)

        if (val.rename) {
          return null
        }

        if (val.mount) { // and validate prefix
          const key = (c.target.key.toString().replace(node.key.toString(), '') || '/').replace('/', '')
          prev = Infinity
          c.reset()
          c.setFeed(m.feed) // will fail for now ...
          c.setTarget(key)
          return null
        }

        if (val.deletion) {
          return null
        }

        if (val.symlink) {
          const visited = c.handlers.visited

          const target = c.result.key.toString()
          const linkname = c.headKey() // head === node

          if ((target.startsWith(linkname + '/') || target === linkname) && depth < MAX_SYMLINK_DEPTH) {
            if (visited && c.i >= ((c.handlers.skip || 0) * 32)) {
              if (visited.includes(node.seq)) return null
              visited.push(node.seq)
            }
            const symlink = JSON.parse(node.value).symlink
            const resolved = resolveLink(target, linkname, symlink)
            c.reset()
            c.setFeed(self.feed)
            c.setTarget(resolved)
            c.handlers.skip = resolveLink.directories
            depth++
            return null
          } else if (depth >= MAX_SYMLINK_DEPTH) {
            const err = new Error('Reached maximum symlink depth.')
            err.maxDepth = true
            throw err
          }
          return null
        }

        return node
      },
      finalise (node) {
        const val = JSON.parse(node.value)
        if (val.rename) return null
        node.key = key
        return node
      }
    })

    c.setFeed(this.feed)
    c.setTarget(key)

    try {
      const { node, i, offset, target } = c.update()
      if (node) {
        node.value = JSON.parse(node.value)
      }
      if (c.handlers.closest) {
        return { i, node, offset, depth, target }
      }
      return node
    } catch (err) {
      if (err.maxDepth) return null
      throw err
    }
  }

  _getPutInfo (key, val = {}, renaming) {
    const self = this
    let depth = 0
    const isDeletion = val.deletion

    const c = new PutController({
      onlink (i, val, seq) {
        const max = isDeletion ? c.target.hash.length - 1 : Infinity
        if (i >= max) return false
        return true
      },
      onlinkclosest (node) {
        if (!isDeleteish(node)) return true
        return node.trie.length > c.j + 1
      },
      onclosest (node) {
        if (!node) return node

        const v = JSON.parse(node.value)
        const target = c.result.key.toString()

        // 1) Check that you match the symlink/rename
        // 2) Rename to current target resolved to symlink/rename
        if (v.rename)  {
          return null // c.getSeq(node.seq - 1)
        } else if (v.symlink && shouldFollowLink(c.headKey(), Buffer.from(target)) && depth < MAX_SYMLINK_DEPTH) {
          const key = c.headKey() // head === node
          if (target === key) return node
          const resolved = resolveLink(target, key, v.symlink)
          c.reset()
          c.setKey(resolved)
          c.setFeed(self.feed)
          depth++
          return null
        } else if (depth >= MAX_SYMLINK_DEPTH) {
          const err = new Error('Reached maximum symlink depth.')
          err.maxDepth = true
          throw err
        }

        return node
      }
    })

    c.renaming = !!renaming
    c.setFeed(this.feed)
    c.setTarget(key)
    c.setValue(JSON.stringify(val))

    try {
      const r = c.update()
      if (r) r.depth = depth
      return r
    } catch (err) {
      if (err.maxDepth) return null
      throw err
    }
  }

  _put (key, value) {
    const info = this._getPutInfo(key, value)
    if (!info) return

    const { node, feed } = info
    feed.append(node)
    return node
  }

  put (key, value) {
    return this._put(key, { value })
  }

  del (key, opts) {
    const value = opts && opts.value
    return this._put(key, { value, deletion: true })
  }

  symlink (target, linkname) {
    // console.log('LINK CONTAINS?', target, linkname, linkContains(linkname, target))
    // Cannot link to a subdirectory of the link itself
    if (linkContains(linkname, target)) return

    const deletion = this.del(linkname)
    // If the deletion reaches the max depth, then abort immediately.
    if (!deletion) return

    const node = this._put(linkname, { value: linkname, symlink: target })
    // TODO: This is a hack because in reality the deletion/symlink should be atomically batched.
    if (!node) this.feed.data.pop()
  }

  rename (from, to) {
    if (from === to) return
    const f = this._getPutInfo(from, {}, true)
    if (!f) return
    const { node: fromNode, feed: fromFeed } = f

    const resolve = this._getPutInfo(to, {}, false)
    if (!resolve) return

    this._put(fromNode.key.toString(), { value: from, deletion: true })
    const fromSeq = this.feed.length - 1
    const t = this._getPutInfo(resolve.node.key.toString(), {}, false)
    if (!t) {
      this.feed.data.pop()
      return
    }

    const { node: toNode, feed: toFeed } = t

    const fromHash = new Hash(fromNode.key)
    const toHash = new Hash(toNode.key)

    let value = null
    if (fromNode && fromNode.head && JSON.parse(fromNode.head.value).symlink) {
      if (fromNode.headKey === fromNode.key.toString()) {
        value = JSON.parse(fromNode.head.value)
      }
    }

    if (!value && fromNode && fromNode.head && fromNode.headKey === fromNode.key.toString()) {
      const i = fromNode.hash.length - 1
      if (!isDeleteish(fromNode.head) || i < fromNode.head.trie.length) {
        fromNode.trieBuilder.link(i, 4, fromNode.head.seq, fromNode.offset / 32)
      }
    }

    const fromTrie = fromNode.trieBuilder
      .slice(fromHash.length - 1)
      .offset(fromHash.length - toHash.length)

    const toTrie = toNode.trieBuilder
      .slice(0, toHash.length - 1);

    if (toFeed !== fromFeed) throw new Error('Cannot rename across feeds')

    const finalTrie = fromTrie.concat(toTrie)

    if (!finalTrie.isLinking(fromSeq)) { // optimisation, the fromSeq is not reachable
      this.feed.data.pop()
    }

    const { deflated } =  finalTrie.finalise()
    const node = {
      key: toNode.key,
      value: JSON.stringify(value || { rename: fromNode.key.toString() }),
      trie: deflated
    }

    toFeed.append(node)
  }

  mount (path, key, opts) {
    this._put(path, { value: path, mount: key, opts })
  }

  [util.inspect.custom] (depth, opts) {
    const lvl = (opts && opts.indentationLvl) || 0
    const indent = ' '.repeat(lvl)

    opts = { ...opts, indentationLvl: lvl + 1, feed: this.feed }

    let nodes = ''

    for (let i = 1; i < this.feed.length; i++) {
      const node = Node.decode(this.feed.get(i), i)
      nodes += node[util.inspect.custom](depth, opts) + '\n'
    }

    return indent + 'MockTrie [\n' +
           nodes +
           indent + ']'
  }
}

function isDeleteish (node) {
  const v = JSON.parse(node.value)
  return v.rename || v.deletion
}
