const test = require('tape')
const Trie = require('../../..')

test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.symlink('/b/b', 'b')
  await trie.put('b', 'wmwjcreshw')
  await trie.put('cdd', 'jrtbvobrwi')
  await trie.put('cb/bdb', 'idnytbbeki')
  await trie.symlink('bdbb', 'ddb')

  // Should return null -> null
  // Actually returns b/b -> wmwjcreshw
  const node = await trie.get('b/b')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})
