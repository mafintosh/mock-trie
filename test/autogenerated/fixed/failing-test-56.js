const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.symlink('/c','b')
  await trie.rename('b','b/bb')
  await trie.put('c','rgbzblnlmz')
}
function runTests () {
  test('trie should return c/bb -> rgbzblnlmz', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return c/bb -> rgbzblnlmz', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('c/bb')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns rgbzblnlmz
    t.same(value, 'rgbzblnlmz', 'getting c/bb returned rgbzblnlmz')
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
