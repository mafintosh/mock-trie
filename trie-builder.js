module.exports = class TrieBuilder {
  constructor () {
    this.data = []
  }

  addLink (i, val, seq) {
    this.link(i, val, seq, 0)
  }

  link (i, val, seq, offset) {
    this.data.push([i, val, seq, offset || 0])
  }

  finalise () {
    const deflated = Buffer.from(JSON.stringify(this.data))
    const links = (new Trie(deflated)).links

    return {
      deflated,
      links
    }
  }

  slice (start, end) {
    const newTrie = new TrieBuilder()
    end = (end === undefined) ? Infinity : end
    newTrie.data = this.data.filter(([i, val, seq, offset]) => {
      if (i >= start && i < end) return true
      return false
    })
    return newTrie
  }

  offset (off) {
    const newTrie = new TrieBuilder()
    newTrie.data = this.data.map(([i, val, seq, oldOffset]) => {
      return [i - off, val, seq, oldOffset + off / 32]
    })
    return newTrie
  }

  concat (other) {
    const newTrie = new TrieBuilder()
    newTrie.data = [...this.data, ...other.data]
    return newTrie
  }

  static inflate (buf) {
    return new Trie(buf).links
  }

  static inflateObject (buf) {
    return new Trie(buf)
  }
}

class Trie {
  constructor (buf) {
    this.data = JSON.parse(buf)
  }

  seq (i, val) {
    for (const [_i, _val, seq, offset] of this.data) {
      if (_i === i && val === _val) return seq
    }
    return 0
  }

  offset (i, val) {
    for (const [_i, _val, seq, offset] of this.data) {
      if (_i === i && val === _val) return offset
    }
    return 0
  }

  get links () {
    const links = []
    for (const [i, val, seq, offset] of this.data) {
      links[i] = links[i] || []
      while (links[i].length <= val) links[i].push(0)
      links[i][val] = seq
    }
    return links
  }

  get length () {
    let max = 0
    for (const [i] of this.data) {
      if (i >= max) max = i + 1
    }
    return max
  }
}
