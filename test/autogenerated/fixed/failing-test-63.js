const test = require('tape')
const Trie = require('../../../trie')
const Reference = require('../../../fuzzing/reference')

async function applyOperations (trie) {
  await trie.symlink('/d','bc')
  await trie.symlink('/bc','c')
  await trie.put('d/db/d/b/cb','vbmnbwyfwc')
  await trie.symlink('/d/c','b')
  await trie.symlink('/b/cb/bc/d','c/c')
  await trie.rename('d','b/c/b')
}
function runTests () {
  test('trie should return d/c/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/c/b/db/d/b/cb -> null', async t => {
    const trie = await getTrie()
    await assertValid(t, trie)
  })

  test.skip('reference should return d/c/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/c/b/db/d/b/cb -> null', async t => {
    const trie = await getReference()
    await assertValid(t, trie)
  })

  async function assertValid (t, trie) {
    const node = await trie.get('d/c/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/c/b/db/d/b/cb')
    const value = (node && node.value) ? node.value.value || node.value : null

    // Actually returns null
    t.same(value, null, 'getting d/c/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/cb/bc/d/c/b/db/d/b/cb returned null')
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
