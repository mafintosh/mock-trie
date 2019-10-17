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
      this.head = this.handlers.onclosest(this.head)
      if (this._reset) {
        this._reset = false
        return this.update()
      }
    }

    if (this.head && this.i === this.target.hash.length) {
      if (this.handlers.finalise) this.head = this.handlers.finalise(this.head)
      return { node: this.head, feed: this.feed }
    }

    return { node: null, feed: null }
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

module.exports = class MockTrie {
  constructor () {
    this.feed = new MockFeed()
    this.feed.append({ header: true })
  }

  getSeq (seq) {
    if (seq <= 0) return null
    const val = this.feed.get(seq)
    if (!val) return null
    return new Node(val.key, val.value, TrieBuilder.inflateObject(val.trie), seq)
  }

  head () {
    return this.getSeq(this.feed.length - 1)
  }

  get (key) {
    if (!Buffer.isBuffer(key)) key = Buffer.from(key)

    let head = this.head()
    const target = new Node(key, null, null, 0)

    for (let i = 0; i < target.hash.length; i++) {
      const val = target.hash.get(i)
      if (val === head.hash.get(i)) continue

      if (i >= head.trie.length) return null

      const link = head.trie[i]
      if (!link) return null

      const seq = link[val]
      if (!seq) return null

      head = this.getSeq(seq)
    }

    if (head.key.equals(target.key)) return head
    return null
  }

  put (key, value) {
    if (!Buffer.isBuffer(key)) key = Buffer.from(key)
    if (!Buffer.isBuffer(value)) value = Buffer.from(value)

    let head = this.head()
    const target = new Node(key, value, null, this.feed.length)

    if (!head) {
      this.feed.append(target.finalise())
      return
    }

    for (let i = 0; i < target.hash.length; i++) {
      const headVal = head.hash.get(i)
      const headLink = i < head.trie.length ? head.trie[i] : null
      const val = target.hash.get(i)

      // copy over existing trie links
      if (headLink) {
        for (let j = 0; j < headLink.length; j++) {
          if (j === val || !headLink[j]) continue // we are closest
          target.trieBuilder.addLink(i, j, headLink[j])
        }
      }

      // no fork yet, continue with current head
      if (val === headVal) continue

      // link the head
      target.trieBuilder.addLink(i, headVal, head.seq)

      // look in the heads trie to find a closer node
      if (!headLink) break
      const seq = headLink[val]
      if (!seq) break

      head = this.getSeq(seq)
    }

    // done, append the target
    this.feed.append(target.finalise())
  }

  replicate (other) {
    this.feed.replicate(other.feed)
  }

  [util.inspect.custom] (depth, opts) {
    const lvl = (opts && opts.indentationLvl) || 0
    const indent = ' '.repeat(lvl)

    let nodes = ''

    for (let i = 1; i < this.feed.length; i++) {
      const node = this.getSeq(i)
      nodes += printNode(node, indent + '  ', this) + '\n'
    }

    return indent + 'MockTrie (\n' +
           nodes +
           indent + ')'
  }
}

module.exports.GetController = GetController
module.exports.PutController = PutController
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
