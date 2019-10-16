const test = require('tape')
const Trie = require('../../../trie')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.rename('bb/b/d/dd', 'cb/cb/b')
  await trie.put('cd/d/b/b', 'rtjviqvjsr')

  // Should return cd/d/b/b -> rtjviqvjsr
  // Actually returns null -> null
  const node = await trie.get('cd/d/b/b')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, 'rtjviqvjsr')
  t.end()
})