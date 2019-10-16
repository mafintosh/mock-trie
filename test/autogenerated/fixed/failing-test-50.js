const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../helpers/reference')

async function applyOperations (trie) {
  await trie.symlink('b/c/../../d/c/../b','b')
  await trie.rename('b','b')
  await trie.put('b/b','wwzwfblqhh')
}
function runTests () {
  test('trie should return d/b/b -> wwzwfblqhh', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return d/b/b -> wwzwfblqhh', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('d/b/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'wwzwfblqhh', 'getting d/b/b returned wwzwfblqhh')
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
