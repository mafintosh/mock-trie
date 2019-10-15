const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.symlink('bb','b')
  await trie.symlink('/d/b/b/c/dd','bb')
  await trie.rename('b','b/c/bb/bd')
  await trie.put('b/b/d/d/c','cndqtpqnmi')
  await trie.rename('b/db/bb/dd/c','d')
}
function runTests () {
  test('trie should return b/b/d/d/c -> cndqtpqnmi', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return b/b/d/d/c -> cndqtpqnmi', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('b/b/d/d/c')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'cndqtpqnmi', 'getting b/b/d/d/c returned cndqtpqnmi')
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
