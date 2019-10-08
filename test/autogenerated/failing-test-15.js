const test = require('tape')              
const Trie = require('../../trie')       
             
test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.put('bb', 'gzmkqrqeto')
  await trie.symlink('/bb', 'b/dbcb/bcdc')
  await trie.put('b/b/bbd', 'sydoimvryf')       

  // Should return b/dbcb/bcdc -> gzmkqrqeto
  // Actually returns null -> null
  const node = await trie.get('b/dbcb/bcdc')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, 'gzmkqrqeto')       
  t.end()                                 
})