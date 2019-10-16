const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.symlink('/b','c')
  await trie.put('b','hwbjvvfceb')
  await trie.symlink('/c','bb')
  await trie.rename('c/c/b','bb')
}
function runTests () {
  test('trie should return bb -> null', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return bb -> null', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('bb')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns hwbjvvfceb
    t.same(value, null, 'getting bb returned null')
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
