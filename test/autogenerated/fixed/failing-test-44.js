const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.symlink('/b','d/d/bc/c')
  await trie.put('b','hdtrnmcxtt')
  await trie.rename('d','c/c')
}
function runTests () {
  test('trie should return c/c/d/bc/c -> hdtrnmcxtt', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return c/c/d/bc/c -> hdtrnmcxtt', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('c/c/d/bc/c')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'hdtrnmcxtt', 'getting c/c/d/bc/c returned hdtrnmcxtt')
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
