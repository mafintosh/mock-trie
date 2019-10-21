const test = require('tape')
const Trie = require('../../..')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.rename('b', 'dc/b/bb/c')
  await trie.put('c/b/b/c', 'fzbbhvbbyj')
  await trie.rename('c', 'bd')

  // Should return bd/b/b/c -> fzbbhvbbyj
  // Actually returns null -> null
  const node = await trie.get('bd/b/b/c')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, 'fzbbhvbbyj')
  t.end()
})

