const test = require('tape')
const Trie = require('../../trie')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.put('c/b/b/c', 'fzbbhvbbyj')
  await trie.rename('c', 'bd')

  // Should return null -> null
  // Actually returns c/b/b/c -> fzbbhvbbyj
  const node = await trie.get('c/b/b/c')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})