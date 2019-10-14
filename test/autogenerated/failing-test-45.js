const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.put('b/c','ufweqgeizd')
  await trie.symlink('c','b/cb')
  await trie.rename('b','d')
}
function runTests () {
  test('trie should return d/cb -> ufweqgeizd', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return d/cb -> ufweqgeizd', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('d/cb')
    const value = (node && node.value) ? node.value.value : null

    // Actually returns null
    t.same(value, 'ufweqgeizd', 'getting d/cb returned ufweqgeizd')
    t.end()
  }
}

async function getTrie () {
  const trie = new Trie()
  applyOperations(trie)
  return trie
}

async function getReference () {
  const reference = new Reference()
  applyOperations(reference)
  return reference
}

if (require.main === module) {
  runTests()
} else {
  module.exports = {
    getTrie,
    getReference
  }
}
