const { GetController, PutController, Node } = require('./')
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
    let prev = Infinity
    var depth = 0

    const c = new GetController({
      onnode (node) {
        // console.log('GET NODE:', node, 'TARGET:', c.target)
        return node
      },

      onclosest (node) {
        // console.log('GET CLOSEST:', node)
        if (!node) return null
        if (node.seq >= prev) return node
        prev = node.seq

        const val = JSON.parse(node.value)

        if (val.rename) {
          const key = (c.target.key.toString().replace(node.key.toString(), val.rename) || '/')
          c.setTarget(key)
          return node
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
          const target = c.target.key.toString()
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
          }
          return null
        }

        return node
      },
      finalise (node) {
        node.key = key
        return node
      }
    })

    c.setFeed(this.feed)
    c.setTarget(key)

    const node = c.update()

    if (node) {
      node.value = JSON.parse(node.value)
    }

    return node
  }

  put (key, value) {
    this._put(key, { value })
  }

  del (key, opts) {
    const value = opts && opts.value
    this._put(key, { value, deletion: true })
  }

  _put (key, val) {
    const self = this
    const maxI = val.deletion ? key.split('/').length * 32 : Infinity
    let prev = Infinity

    // console.log('before put, trie:', this)

    const c = new PutController({
      onlink (i, val, seq) {
        if (i >= maxI) return false
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
        // console.log('CLOSEST VALUE:', v)

        // 1) Check that you match the symlink/rename
        // 2) Rename to current target resolved to symlink/rename
        if (v.rename)  {
          const key = redirectTo(c.target, node, v.rename)
          c.setTarget(key)
          return node
        } else if (v.symlink && shouldFollowLink(node.key, c.target.key)) {
          const target = c.target.key.toString()
          const key = node.key.toString()
          if (target === key) return node

          const resolved = resolveLink(target, key, v.symlink)
          c.reset()
          c.setKey(resolved)
          c.setFeed(self.feed)
          return null
        }
        return node
      }
    })

    c.setFeed(this.feed)
    c.setTarget(key)
    c.setValue(JSON.stringify(val))

    const ret = c.update()
    return ret
  }

  symlink (target, linkname) {
    // console.log('LINK CONTAINS?', target, linkname, linkContains(linkname, target))
    // Cannot link to a subdirectory of the link itself
    if (linkContains(linkname, target)) return

    this.del(linkname)
    this._put(linkname, { value: linkname, symlink: target })
  }

  rename (from, to) {
    this._put(to, { value: to, rename: from })
    this._put(from, { value: from, deletion: true })
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
