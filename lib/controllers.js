const MockFeed = require('mock-feed')
const HashPath = require('./hash')
const TrieBuilder = require('./trie-builder')
const util = require('util')

class PutController {
  constructor (handlers, opts = {}) {
    this.handlers = handlers
    this.feed = null
    this.target = null
    this.i = 0
    this.j = 0
    this.head = null
    this.trieBuilder = new TrieBuilder()
    this.value = null

    this._returnTrie = !!opts.trie
    this._reset = false
    this._key = null
    this._trieOffset = 0
    this._o = 0
  }

  reset () {
    this.feed = null
    this.target = null
    this.trieBuilder = new TrieBuilder()
    this.i = 0
    this.head = null
    this.result = null
    this._reset = true
    this._trieOffset = 0
    this._o = 0
  }

  setFeed (feed) {
    this.feed = feed
    this.head = null
    this.i = 0
    this._reset = true
    this._o = 0
  }

  setOffset (offset) {
    this._o = 32 * offset
  }

  setTarget (key) {
    if (!Buffer.isBuffer(key)) key = Buffer.from(key)
    if (!this._key) this._key = key
    this.target = new Node(key, null, null)
    if (!this.result) this.result = this.target
    this.i = 0
    this._reset = true
    this._o = 0
    this.j = 0
    return key
  }

  setKey (key) {
    this._key = this.setTarget(key)
  }

  setValue (val) {
    this.value = val
  }

  key () {
    if (!this.head || !this.result) return null
    if (this.i === this.result.hash.length) return this.head.key.toString()

    const r = this.result.key.toString().split('/')
    const t = this.head.key.toString().split('/')

    const ri = Math.floor(this.i / 32)
    const ti = Math.floor((this.i - this._o) / 32)

    return t.slice(0, ti).concat(r.slice(ri)).join('/')
  }

  headKey () {
    if (!this.head || !this.result) return null
    if (this.i === this.result.hash.length) return this.result.key.toString()

    const r = this.result.key.toString().split('/')
    const t = this.head.key.toString().split('/')

    const ri = Math.floor(this.i / 32)
    const ti = Math.floor((this.i - this._o) / 32)

    const res = r.slice(0, ri).concat(t.slice(ti)).join('/')

    return res
  }

  update () {
    this._update()
    if (this._returnTrie) return this.trieBuilder

    const { deflated } = this.trieBuilder.finalise()

    const node = {
      key: this._key,
      value: this.value,
      trie: deflated,
      hash: this.target.hash,
      trieBuilder: this.trieBuilder,
      head: this.head,
      headKey: this.headKey()
    }

    return { node, feed: this.feed }
  }

  _link (i, val, seq, offset) {
    if (!offset) offset = 0
    offset *= 32
    offset += this._o
    if (i < this._trieOffset) return
    this._trieOffset = i // hack to not rebuild the trie, todo: better solition
    if (this.handlers.onlink && !this.handlers.onlink(i, val, seq)) return
    this.trieBuilder.link(i, val, seq, -(offset / 32))
  }

  _update () {
    for (; this.i < this.target.hash.length; this.i++) {
      if (!this.head) {
        this.head = this.getSeq(this.feed.length - 1)

        if (this._reset) {
          this._reset = false
          this.i--
          continue
        }
      }

      if (!this.head) break

      const i = this.i
      const j = this.j = this.i - this._o
      const headVal = this.head.hash.get(j)
      const headLink = j < this.head.trie.length ? this.head.trie[j] : null
      const val = this.target.hash.get(this.i)

      // copy over existing trie links
      if (headLink) {
        for (let k = 0; k < headLink.length; k++) {
          if (k === val || !headLink[k]) continue // we are closest
          this._link(i, k, headLink[k], -this.head.trieObject.offset(j, k))
        }
        // preserve explicit link set by rename
        if (val === 4 && headLink[4] && headVal === 4 && this.renaming) {
          this._link(i, 4, headLink[4], -this.head.trieObject.offset(j, 4))
        }
      }

      if (val === headVal) continue

      // link the head
      if (!this.handlers.onlinkclosest || this.handlers.onlinkclosest(this.head)) {
        this._link(i, headVal, this.head.seq)
      }

      if (j >= this.head.trie.length) break

      const link = this.head.trie[j]
      if (!link) break

      const seq = link[val]
      if (!seq) break

      const offset = this.head.trieObject.offset(j, val)
      if (offset) {
        this._o += -32 * offset
      }

      this.head = this.getSeq(seq)

      if (this._reset) {
        this._reset = false
        this.i--
        continue
      }
    }

    if (this.handlers.onclosest) {
      this.head = this.handlers.onclosest(this.head)
      if (this._reset) {
        this._reset = false
        return this._update()
      }
    }

    if (this.head && this.head.key.equals(this.target.key)) {
      if (this.handlers.finalise) this.head = this.handlers.finalise(this.head)
      return this.head
    }

    return null
  }

  getSeq (seq) {
    if (seq <= 0) return null
    const val = this.feed.get(seq)
    if (!val) return null
    const node = new Node(val.key, val.value, TrieBuilder.inflateObject(val.trie), seq)
    if (this.handlers.onnode) {
      return this.handlers.onnode(node)
    }
    return node
  }
}

const {
  resolveLink,
  shouldFollowLink,
  linkContains,
  redirectTo
} = require('./paths')

const MAX_SYMLINK_DEPTH = 20

class IteratorController {
  constructor (handlers) {
    this.handlers = handlers
    this.stack = null
    this.feed = null
  }

  setFeed (feed) {
    this.feed = feed
  }

  _push (i, head, key, all) {
    const j = (i / 32) | 0
    const p = head.key.toString().split('/')
    if (j >= p.length) return
    key.push(p[j])
    if (!all) return
    const rest = p.slice(j + 1)
    if (rest) key.push(...rest)
  }

  pop () {
    let { d, key, i, val, head } = this.stack.pop()

    for (; i < head.trie.length; i++) {
      const links = head.trie[i] || []

      if (((i + 1) & 31) === 0) this._push(i, head, key, false)

      for (; val < links.length; val++) {
        const offset = head.trieObject.offset(i, val)
        const seq = links[val]
        if (!seq) continue
        this.stack.push({ d, key, i, val: val + 1, head })
        this.stack.push({ d, key: key.slice(), i: i + 1 + 32 * offset, val: 0, head: this.getSeq(seq) })
        return null
      }

      val = 0
    }

    if ((i & 31) !== 0 || i < head.hash.length) this._push(i, head, key, true)

    const value = JSON.parse(head.value)

    if (value.rename) return null
    if (value.deletion) return null

    if (value.symlink) {
      const k = key.join('/')
      const resolved = resolveLink(k, k, value.symlink)

      if (d >= MAX_SYMLINK_DEPTH) return null

      if (this.handlers && this.handlers.get) {
        const r = this.handlers.get(resolved)
        if (!r) return null
        const { i, node: head } = r
        if (head) {
          this.stack.push({ d: d + 1, key, i, val: 0, head: this.getSeq(head.seq) })
        }
        return
      }
    }

    return {
      key: key.join('/'),
      value
    }
  }

  next () {
    if (!this.stack) {
      if (this.handlers.prefix) {
        const r = this.handlers.get(this.handlers.prefix)
        if (r) {
          const { i, node: head } = r
          if (!head) this.stack = []
          else this.stack = [{ d: 0, key: this.handlers.prefix.split('/'), i, val: 0, head: this.getSeq(head.seq) }]
        } else {
          this.stack = []
        }
      } else {
        this.stack = [{ d: 0, key: [], i: 0, val: 0, head: this.getSeq(this.feed.length - 1) }]
      }
    }

    while (this.stack.length) {
      const node = this.pop()
      if (node) return node
    }

    return null
  }

  getSeq (seq) {
    if (seq <= 0) return null
    const val = this.feed.get(seq)
    if (!val) return null
    const node = new Node(val.key, val.value, TrieBuilder.inflateObject(val.trie), seq)
    if (this.handlers.onnode) {
      return this.handlers.onnode(node)
    }
    return node
  }
}

class GetController {
  constructor (handlers) {
    this.handlers = handlers
    this.feed = null
    this.target = null
    this.i = 0
    this.head = null
    this._reset = false
    this._o = 0
    this._length = -1
  }

  reset () {
    this.feed = null
    this.target = null
    this.i = 0
    this.head = null
    this.result = null
    this._reset = true
    this._o = 0
  }

  setFeed (feed) {
    this.feed = feed
    this.head = null
    this.i = 0
    this._reset = true
    this._o = 0
  }

  setTarget (key) {
    if (!Buffer.isBuffer(key)) key = Buffer.from(key)
    this.target = new Node(key, null, null)
    if (!this.result) this.result = this.target
    this.i = 0
    this._o = 0
    this._reset = true
  }

  key () {
    const r = this.result.key.toString().split('/')
    const t = this.head.key.toString().split('/')

    const ri = Math.floor(this.i / 32)
    const ti = Math.floor((this.i + this._o) / 32)

    return t.slice(0, ti).concat(r.slice(ri)).join('/')
  }

  headKey () {
    if (this.i === this.target.hash.length) return this.result.key.toString()
    if (this.head === null) return null

    const r = this.target.key.toString().split('/')
    const t = this.head.key.toString().split('/')

    const ri = Math.floor(this.i / 32)
    const ti = Math.floor((this.i + this._o) / 32)

    const res = r.slice(0, ri).concat(t.slice(ti)).join('/')

    return res
  }

  update () {
    const len = this.handlers.closest ? Math.max(0, this.target.hash.length - 1) : this.target.hash.length
    for (; this.i < len; this.i++) {
      if (!this.head) {
        this.head = this.getSeq(this.feed.length - 1)

        if (this._reset) {
          this._reset = false
          this.i--
          continue
        }
      }

      if (!this.head) break

      let val = this.target.hash.get(this.i)
      const j = this.j = this.i + this._o

      if (val === this.head.hash.get(j) && this.head.trieObject.seq(j, val) === 0) {
        continue
      }

      if (j >= this.head.trie.length) break

      const link = this.head.trie[j]
      if (!link) break

      let seq = link[val]
      if (!seq) break

      const offset = this.head.trieObject.offset(j, val)
      if (offset) {
        this._o += 32 * offset
        this._length += this._o
      }

      this.head = this.getSeq(seq)

      if (this._reset) {
        this._o = 0
        this._reset = false
        this.i--
        continue
      }
    }

    if (this.handlers.onclosest) {
      if (this.i >= len) this.prev = { node: this.head, i: this.i, feed: this.feed }
      this.head = this.handlers.onclosest(this.head)
      if (!this.head)
      if (this._reset) {
        this._reset = false
        return this.update()
      }
    }

    if (this.head && this.i >= len) {
      if (this.handlers.finalise && !this.handlers.closest) this.head = this.handlers.finalise(this.head)
      return { node: this.head, feed: this.feed, i: this.i }
    }

    if (this.handlers.closest && this.prev) {
      return this.prev
    }

    return { node: null, feed: null, i: 0 }
  }

  getSeq (seq) {
    if (seq <= 0) return null
    const val = this.feed.get(seq)
    if (!val) return null
    const node = new Node(val.key, val.value, TrieBuilder.inflateObject(val.trie), seq)
    if (this.handlers.onnode) {
      return this.handlers.onnode(node)
    }
    return node
  }
}

class Node {
  constructor (key, value, trie, seq) {
    this.seq = seq
    this.key = key
    this.value = value || null
    this.hash = new HashPath(key)
    this.trieObject = trie
    this.trie = trie ? trie.links : []
    this.trieBuilder = new TrieBuilder()
  }

  finalise () {
    const { deflated, links } = this.trieBuilder.finalise()
    this.trie = links

    return {
      key: this.key,
      value: this.value,
      trie: deflated
    }
  }

  static decode (val, seq) {
    return new Node(val.key, val.value, TrieBuilder.inflateObject(val.trie), seq)
  }

  [util.inspect.custom] (depth, opts) {
    const lvl = (opts && opts.indentationLvl) || 0
    const indent = ' '.repeat(lvl)
    return printNode(this, indent, opts)
  }
}

module.exports.GetController = GetController
module.exports.PutController = PutController
module.exports.IteratorController = IteratorController
module.exports.Node = Node

function printNode (node, indent, opts) {
  let h = ''

  for (let i = 0; i < node.hash.length; i++) {
    h += node.hash.get(i)
  }

  let trie = ''

  if (node.trie) {
    for (let i = 0; i < node.trie.length; i++) {
      if (!node.trie[i]) continue
      const links = node.trie[i]
      let l = ''

      for (let j = 0; j < links.length; j++) {
        const seq = links[j]
        const offset = node.trieObject.offset(i, j)
        const oStr = offset ? ' (' + (offset < 0 ? offset : ('+' + offset)) + ')' : ''
        if (seq) l += (l ? ', ' : '') + j + ' -> ' + seq + oStr + (opts && opts.feed ? ' (' + opts.feed.get(seq).key.toString() + ')' : '')
      }

      trie += indent + '    ' + i + ' -> [' + l + ']\n'
    }
  }

  return indent + 'Node {\n'
    + indent + '  seq: ' + node.seq + '\n'
    + indent + '  hash: ' + h.replace(/(.{32})/g, '$1 ') + '\n'
    + indent + '  key: ' + node.key.toString() + '\n'
    + indent + '  value: ' + (node.value && JSON.stringify(node.value)) + '\n'
    + indent + '  trie:\n'
    + trie
    + indent + '}'
}
