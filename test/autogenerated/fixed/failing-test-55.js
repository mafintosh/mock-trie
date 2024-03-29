const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.put('b/c/d/d','rppfmbqpit')
  await trie.symlink('/b/c','c/c')
  await trie.rename('c/c','bb')
}
function runTests () {
  test('trie should return bb/d/d -> rppfmbqpit', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return bb/d/d -> rppfmbqpit', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('bb/d/d')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'rppfmbqpit', 'getting bb/d/d returned rppfmbqpit')
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
