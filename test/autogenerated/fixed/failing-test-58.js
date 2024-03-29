const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.symlink('../db','d/b')
  await trie.rename('d','c')
  global.debug = true
  await trie.put('c/b/c/bc/dd','ztkrjhddqo')
}
function runTests () {
  test('trie should return db/c/bc/dd -> ztkrjhddqo', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return db/c/bc/dd -> ztkrjhddqo', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('db/c/bc/dd')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'ztkrjhddqo', 'getting db/c/bc/dd returned ztkrjhddqo')
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
