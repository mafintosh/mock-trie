const test = require('tape')
const Trie = require('../../..')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.symlink('d', 'b')
  await trie.put('b/b/db', 'ihihijdrrm')
  await trie.rename('b', 'c/d/bd')

  // Should return c/d/bd/b/db -> null
  const node = await trie.get('c/d/bd/b/db')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})

