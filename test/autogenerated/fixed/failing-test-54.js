const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../helpers/reference')

async function applyOperations (trie) {
  await trie.symlink('../d','b')
  await trie.put('d','uhfehpfhhl')
  await trie.rename('b','c/c/b/c')
  await trie.rename('d','db/b/c/b')
}
function runTests () {
  test('trie should return db/b/c/b -> uhfehpfhhl', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return db/b/c/b -> uhfehpfhhl', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('db/b/c/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'uhfehpfhhl', 'getting db/b/c/b returned uhfehpfhhl')
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
