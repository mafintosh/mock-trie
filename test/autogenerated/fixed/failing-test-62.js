const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.symlink('/c','b/b/c')
  await trie.rename('b/b','b')
  await trie.put('b/c/c','gufxcyswbj')
}
function runTests () {
  test('trie should return b/c/c -> gufxcyswbj', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return b/c/c -> gufxcyswbj', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('b/c/c')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'gufxcyswbj', 'getting b/c/c returned gufxcyswbj')
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
