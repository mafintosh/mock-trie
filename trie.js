const { GetController, PutController, Node } = require('./')
const MockFeed = require('mock-feed')
const util = require('util')

module.exports = class Trie {
  constructor () {
    this.feed = new MockFeed()
    this.feed.append({ header: true })
  }

  get (key) {
    const self = this
    let prev = Infinity

    const c = new GetController({
      onnode (node) {
        return node
      },

      onclosest (node) {
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

        if (val.symlink && node.key.equals(c.target.key)) {
          prev = Infinity
          c.reset()
          c.setFeed(self.feed)
          c.setTarget(val.symlink)
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

  _put (key, val) {
    const maxI = val.deletion ? key.split('/').length * 32 : Infinity
    let prev = Infinity

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

        if (v.rename) {
          const key = redirectTo(c.target, node, v.rename)
          c.setTarget(key)
          return node
        }
        // const key = (c.target.key.toString().replace(node.key.toString(), val.rename) || '/')

        return node
      }
    })

    c.setFeed(this.feed)
    c.setTarget(key)
    c.setValue(JSON.stringify(val))

    return c.update()
  }

  symlink (target, linkname) {
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

function redirectTo (target, node, rename) {
  const t = target.key.toString()
  const n = node.key.toString()

  return t.replace(n, rename)
}
