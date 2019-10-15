const test = require('tape')
const Trie = require('../../trie')
const Reference = require('../helpers/reference')

async function applyOperations (trie) {
  await trie.rename('c/b/d/d','d/b/c/b/db')
  await trie.rename('c/b/d/d','b')
  await trie.put('b','dvsjpfispt')
  console.log(trie)
}
function runTests () {
  test('trie should return b -> dvsjpfispt', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return b -> dvsjpfispt', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('b')
    const value = (node && node.value) ? node.value.value : null

    // Actually returns null
    t.same(value, 'dvsjpfispt', 'getting b returned dvsjpfispt')
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

if (require.main === module) {
  runTests()
} else {
  module.exports = {
    getTrie,
    getReference
  }
}
