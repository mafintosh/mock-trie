const sodium = require('sodium-native')
const KEY = Buffer.alloc(32).fill('hypertrie')

module.exports = class HashPath {
  constructor (key) {
    this.hash = hash(key)
    this.length = this.hash.length * 4 + 1
  }

  get (i) {
    const j = i >> 2
    if (j >= this.hash.length) return 4
    return (this.hash[j] >> (2 * (i & 3))) & 3
  }
}

function hash (data) {
  const out = Buffer.allocUnsafe(8)
  sodium.crypto_shorthash(out, data, KEY)
  return out
}
