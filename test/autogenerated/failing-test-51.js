const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.symlink('/c','b')
  await trie.put('b/bb/b','zdubguqsyk')
  await trie.rename('b','b/bb')
}
function runTests () {
  test('trie should return c/bb/b -> null', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return c/bb/b -> null', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('c/bb/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns zdubguqsyk
    t.same(value, null, 'getting c/bb/b returned null')
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
