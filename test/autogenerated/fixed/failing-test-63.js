const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.put('b','nvzmgsrlyb')
  await trie.put('d','jdkgemhudi')
  await trie.put('b/d/cb/b/cb', 'db')
  await trie.rename('b','b/b/c')
  await trie.rename('b/b','b')
  await trie.put('b/c/c','gufxcyswbj')
}
function runTests () {
  test('trie should return b/c/d -> null', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return b/c/d -> null', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('b/c/d')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns jdkgemhudi
    t.same(value, null, 'getting b/c/d returned null')
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
