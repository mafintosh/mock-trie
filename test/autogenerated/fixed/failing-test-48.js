const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.symlink('/c/b/db/d/b','b')
  await trie.put('b/b','tcmkhtepxj')
  await trie.rename('b/c/d/db','cd')
}
function runTests () {
  test('trie should return cd/b -> null', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return cd/b -> null', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('cd/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns tcmkhtepxj
    t.same(value, null, 'getting cd/b returned null')
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
