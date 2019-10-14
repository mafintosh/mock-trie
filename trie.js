const { GetController, PutController, Node } = require('./')
const Hash = require('./hash')
const SandboxPath = require('sandbox-path')
const MockFeed = require('mock-feed')
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

  get (key) {
    const self = this
    let depth = 0
    let prev = Infinity

    const c = new GetController({
      onnode (node) {
        // console.log('GET NODE:', node, 'TARGET:', c.target)
        return node
      },

      onclosest (node) {
        if (!node) return null
        if (node.seq >= prev) return node
        prev = node.seq
// console.log('closett', node, c.i, node.hash.length, c.target.key.toString())
        const val = JSON.parse(node.value)

        if (val.rename) {
          const key = redirectTo(c.target, node, val.rename)
          // const key = (c.target.key.toString().replace(node.key.toString(), val.rename) || '/')
          // console.log('c.target', c.target.key.toString())
          // console.log('node', node.key.toString())
          // console.log('rename', val.rename.toString())
          // console.log('recirect!', key)
          c.setTarget(key)
          return c.getSeq(node.seq - 1) // TODO: just check that we do not visit the same node twice instead
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
          const target = c.key()
          const linkname = node.key.toString()

          // console.log('IN A SYMLINK, target:', target, 'linkname:', linkname)
          if ((target.startsWith(linkname + '/') || target === linkname) && depth < MAX_SYMLINK_DEPTH) {
            const symlink = JSON.parse(node.value).symlink
            const resolved = resolveLink(target, linkname, symlink)
            // console.log('FOUND SYMLINK:', symlink, 'AT:', linkname, 'TARGET:', target, 'RIGHT KEY?', target.startsWith(linkname))
            // console.log('  setting target to:', resolved, 'symlink:', symlink)
            prev = Infinity
            c.reset()
            c.setFeed(self.feed)
            c.setTarget(resolved)
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
      const { node } = c.update()
      if (node) {
        node.value = JSON.parse(node.value)
      }
      return node
    } catch (err) {
      if (err.maxDepth) return null
      throw err
    }
  }

  _getPutInfo (key, val = {}, renaming) {
    const self = this
    let prev = Infinity
    let depth = 0
    const isDeletion = val.deletion

    // console.log('before put, trie:', this)

    const c = new PutController({
      onlink (i, val, seq) {
        const max = isDeletion ? c.target.hash.length - 1 : Infinity
        if (i >= max) return false
        return true
      },
      onnode (node) {
        // if (val.deletion) {
        //   // if (node.key.toString().startsWith(key.toString())) {
        //   //   return null
        //   // }
        // }
        return node
      },
      onclosest (node) {
        if (!node) return node
        if (node.seq >= prev) return node
        prev = node.seq

        const v = JSON.parse(node.value)
        const target = c.key()


        // 1) Check that you match the symlink/rename
        // 2) Rename to current target resolved to symlink/rename
        if (v.rename)  {
          if (c.i >= node.hash.length) {
            const key = redirectTo(c.target, node, v.rename)
            const prev = c.target.hash.length
            c._trieOffset = Math.max(c.i, c._trieOffset)
            c.setTarget(key)
          }
          // c.setOffset((prev - c.target.hash.length) / 32)
          return c.getSeq(node.seq - 1)
        } else if (v.symlink && shouldFollowLink(node.key, Buffer.from(target)) && depth < MAX_SYMLINK_DEPTH) {
          const key = node.key.toString()
          if (target === key && !c.renaming) return node
          const resolved = resolveLink(target, key, v.symlink)
          prev = Infinity
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
      return c.update()
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
    const f = this._getPutInfo(from, {}, true)
    if (!f) return
    const { node: fromNode, feed: fromFeed } = f
    this._put(from, { value: from, deletion: true })
    const { node: toNode, feed: toFeed } = this._getPutInfo(to, {}, false)

    const fromHash = new Hash(fromNode.key)
    const toHash = new Hash(toNode.key)

    if (fromNode && fromNode.head && fromNode.head.key.equals(fromNode.key)) {
      fromNode.trieBuilder.link(fromNode.hash.length - 1, 4, fromNode.head.seq)
    }

    const fromTrie = fromNode.trieBuilder
      .slice(fromHash.length - 1)
      .offset(fromHash.length - toHash.length)

    const toTrie = toNode.trieBuilder
      .slice(0, toHash.length - 1);

    if (toFeed !== fromFeed) throw new Error('Cannot rename across feeds')

    const { deflated } =  fromTrie.concat(toTrie).finalise()
    const node = {
      key: toNode.key,
      value: JSON.stringify({ rename: from }),
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
