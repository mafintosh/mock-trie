const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.symlink('../d','b')
  await trie.put('d','jpkmhlbxuv')
  await trie.rename('b','b/b/bb/c')
}
function runTests () {
  test('trie should return d -> jpkmhlbxuv', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test('reference should return d -> jpkmhlbxuv', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('d')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'jpkmhlbxuv', 'getting d returned jpkmhlbxuv')
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
