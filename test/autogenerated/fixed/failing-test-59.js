const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.put('c','fyqmvdmewh')
  await trie.rename('c','d')
  await trie.put('d/c/b/b/db','sowibdhkoo')
  await trie.rename('d','c/dd/b/b/bc')
}
function runTests () {
  test('trie should return c/dd/b/b/bc -> fyqmvdmewh', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return c/dd/b/b/bc -> fyqmvdmewh', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('c/dd/b/b/bc')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'fyqmvdmewh', 'getting c/dd/b/b/bc returned fyqmvdmewh')
    t.end()
  }
}

async function getTrie () {
  const trie = new Trie()
  await applyOperations(trie)
  return trie
}

async function getReference () {
  const reference = new Reference()
  await applyOperations(reference)
  return reference
}

if (require.main) {
  runTests()
} else {
  module.exports = {
    runTests,
    getTrie,
    getReference
  }
}
