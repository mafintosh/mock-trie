const test = require('tape')
const Trie = require('../../..')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.symlink('b/../../dd', 'b')
  await trie.put('dcb/b', 'lcmksvcoib')
  await trie.put('b/bb/b', 'bzykdfbdfx')

  // Should return dcb/b -> lcmksvcoib
  // Actually returns null -> null
  const node = await trie.get('dcb/b')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, 'lcmksvcoib')
  t.end()
})
