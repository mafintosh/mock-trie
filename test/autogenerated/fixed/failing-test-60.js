const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.symlink('c','b')
  await trie.put('c/d/b/c','jegrzceccj') // b/d/b/c
  await trie.rename('b/d','b') // b/b/c
  // console.log(await trie.get('b/b/c'))
  await trie.rename('b/b/c','bc/cb') // bc/cb
  console.log(trie)

}
function runTests () {
  test('trie should return bc/cb -> jegrzceccj', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return bc/cb -> jegrzceccj', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('bc/cb')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'jegrzceccj', 'getting bc/cb returned jegrzceccj')
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
