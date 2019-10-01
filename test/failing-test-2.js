const test = require('tape')
const Trie = require('../trie')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.put('cc', 'lxlwfhmteo')
  await trie.put('d/b', 'ybxjsbvksn')
  await trie.symlink('bcb', 'bb')
  await trie.symlink('bbbc', 'd')
  await trie.put('bdb', 'tvhtzzemjz')

  // Should return null -> null
  // Actually returns d/b -> ybxjsbvksn
  const node = await trie.get('d/b')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})

