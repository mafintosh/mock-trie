const test = require('tape')
const Trie = require('../../../trie')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.symlink('d/../../c/b/..', 'c')
  await trie.put('b', 'zzmbjqbomi')
  await trie.put('bbd/b', 'ipwixwrpcv')

  // Should return c/b -> null
  // Actually returns c/b -> null
  const node = await trie.get('c/b')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})