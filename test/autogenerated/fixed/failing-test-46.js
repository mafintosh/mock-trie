const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.put('d','ixhpyqxvib')
  await trie.rename('d','b')
  await trie.rename('b','cd/c/dd')
}
function runTests () {
  test('trie should return cd/c/dd -> ixhpyqxvib', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return cd/c/dd -> ixhpyqxvib', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('cd/c/dd')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'ixhpyqxvib', 'getting cd/c/dd returned ixhpyqxvib')
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
