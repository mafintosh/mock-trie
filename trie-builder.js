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
