const MockFeed = require('mock-feed')
const HashPath = require('./hash')
const TrieBuilder = require('./trie-builder')
const util = require('util')

class Node {
  constructor (key, value, trie, seq) {
    this.seq = seq
    this.key = key
    this.value = value || null
    this.hash = new HashPath(key)
    this.trie = trie || []
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

  [util.inspect.custom] (depth, opts) {
    const lvl = opts.indentationLvl || 0
    const indent = ' '.repeat(lvl)
    return printNode(this, indent)
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
    return new Node(val.key, val.value, TrieBuilder.inflate(val.trie), seq)
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
    const lvl = opts.indentationLvl || 0
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

function printNode (node, indent, mockTrie) {
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
        if (seq) l += (l ? ', ' : '') + j + ' -> ' + seq + (mockTrie ? ' (' + mockTrie.getSeq(seq).key.toString() + ')' : '')
      }

      trie += indent + '    ' + i + ' -> [' + l + ']\n'
    }
  }

  return indent + 'Node {\n'
    + indent + '  seq: ' + node.seq + '\n'
    + indent + '  hash: ' + h + '\n'
    + indent + '  key: ' + node.key.toString() + '\n'
    + indent + '  value: ' + node.value.toString() + '\n'
    + indent + '  trie:\n'
    + trie
    + indent + '}'
}
