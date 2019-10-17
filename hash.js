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
  const parts = split(data)
  const out = Buffer.allocUnsafe(8 * parts.length)
  for (let i = 0; i < parts.length; i++) {
    sodium.crypto_shorthash(out.slice(i * 8), parts[i], KEY)
  }
  return out
}

function split (data) {
  if (!data.length) return []

  const ch = Buffer.from('/')[0]
  const parts = []

  while (true) {
    const i = data.indexOf(ch)
    if (i === -1) {
      parts.push(data)
      return parts
    }
    parts.push(data.slice(0, i))
    data = data.slice(i + 1)
  }
}
