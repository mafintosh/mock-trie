const test = require('tape')
const Trie = require('../../..')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.put('bb', 'wspwzzthod')
  await trie.rename('bb', 'bb/c')

  // Should return null -> null
  // Actually returns bb/c/c -> wspwzzthod
  const node = await trie.get('bb/c/c')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})
