const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.put('dd/cd/b/b','khrconhext')
  await trie.rename('dd','b/b/d')
  await trie.rename('b/b','d')
  await trie.put('d/d/b/db','vvdffifehb')
  await trie.rename('d','bb')
}
function runTests () {
  test('trie should return bb/d/cd/b/b -> khrconhext', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return bb/d/cd/b/b -> khrconhext', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('bb/d/cd/b/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'khrconhext', 'getting bb/d/cd/b/b returned khrconhext')
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
