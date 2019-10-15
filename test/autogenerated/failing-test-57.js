const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.symlink('/c','b')
  await trie.rename('b','b/bb')
  await trie.put('c/bb/bd/bd/d','ufjchrqdqb')
}
function runTests () {
  test('trie should return c/bd/bd/d -> ufjchrqdqb', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return c/bd/bd/d -> ufjchrqdqb', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('c/bd/bd/d')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'ufjchrqdqb', 'getting c/bd/bd/d returned ufjchrqdqb')
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
