const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.symlink('d/bd','b')
  await trie.symlink('b/d','d')
  await trie.put('c/c/b/c/d','wdzdsjtobv')
  await trie.rename('d/bd','c')
}
function runTests () {
  test('trie should return c/c/b/c/d -> wdzdsjtobv', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return c/c/b/c/d -> wdzdsjtobv', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('c/c/b/c/d')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns wdzdsjtobv
    t.same(value, 'wdzdsjtobv', 'getting c/c/b/c/d returned wdzdsjtobv')
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
