const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.put('b/bd/b','micwjqmbme')
  await trie.rename('b','b/b')
  await trie.rename('b/b/bb','c')
}
function runTests () {
  test('trie should return b/b/bd/b -> micwjqmbme', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return b/b/bd/b -> micwjqmbme', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('b/b/bd/b')
    const value = (node && node.value) ? node.value.value : null

    // Actually returns null
    t.same(value, 'micwjqmbme', 'getting b/b/bd/b returned micwjqmbme')
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
