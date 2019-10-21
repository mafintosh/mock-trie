const test = require('tape')
const Trie = require('../../..')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.put('d', 'uusnvluemx')
  await trie.symlink('d', 'c')
  await trie.put('c/c', 'qhzeuyfjsn')

  // Should return d/c -> qhzeuyfjsn
  // Actually returns null -> null
  const node = await trie.get('d/c')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, 'qhzeuyfjsn')
  t.end()
})
