const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.put('dd/c/bc/b','dsiypoxbuo')
  await trie.put('dd/d/c/c','ljbdomybyu')
  await trie.rename('dd','bb/b/db')
  await trie.put('bb/b/db/c/b/bc','nlcmgluggs')
}
function runTests () {
  test('trie should return bb/b/db/c/bc/b -> dsiypoxbuo', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return bb/b/db/c/bc/b -> dsiypoxbuo', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('bb/b/db/c/bc/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'dsiypoxbuo', 'getting bb/b/db/c/bc/b returned dsiypoxbuo')
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
