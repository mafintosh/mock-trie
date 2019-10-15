const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.put('b/b/cb','jrtopmcslg')
  await trie.rename('b','d')
  await trie.symlink('b/c/../../d/c/../b','b')
  await trie.rename('b','b')
  await trie.put('b/b','wwzwfblqhh')
}
function runTests () {
  test('trie should return b/cb -> jrtopmcslg', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return b/cb -> jrtopmcslg', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('b/cb')
    const value = (node && node.value) ? node.value.value : null

    // Actually returns null
    t.same(value, 'jrtopmcslg', 'getting b/cb returned jrtopmcslg')
    t.end()
  }
}

async function getTrie () {
  const trie = new Trie()
  applyOperations(trie)
  return trie
}

async function getReference () {
  const reference = new Reference()
  applyOperations(reference)
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
