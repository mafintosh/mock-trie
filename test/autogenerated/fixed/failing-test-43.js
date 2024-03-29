const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.put('b/b/b','dzqjbhrwle')
  await trie.rename('b/b','bc')
  await trie.put('bc/cb/bb','tuqiycoujz')
}
function runTests () {
  test('trie should return bc/b -> dzqjbhrwle', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return bc/b -> dzqjbhrwle', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('bc/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'dzqjbhrwle', 'getting bc/b returned dzqjbhrwle')
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
