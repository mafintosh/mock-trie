const test = require('tape')
const Trie = require('../../..')
const Reference = require('../../../reference')

async function applyOperations (trie) {
  await trie.put('b/b','nclbqdlpvs')
  await trie.rename('b/b','d') // d
  await trie.rename('d/bb/d','d/b') // d
  await trie.rename('d','bb') // bb
  await trie.rename('b/dd/bc/d/dd','bb/bb/c/d') // bb
  await trie.symlink('/d/bc/d/d/bd','b') //
  await trie.rename('bb','b/b') // /d/bc/d/d/bd/b
}
function runTests () {
  test('trie should return d/bc/d/d/bd/b -> nclbqdlpvs', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return d/bc/d/d/bd/b -> nclbqdlpvs', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('d/bc/d/d/bd/b')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, 'nclbqdlpvs', 'getting d/bc/d/d/bd/b returned nclbqdlpvs')
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
