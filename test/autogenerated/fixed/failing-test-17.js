const test = require('tape')            
const Trie = require('../../../trie') 
             
test('failing autogenerated test case', async t => {
  const trie = new Trie()

  await trie.put('b/c/d', 'bbnbqtbtbr')
  await trie.symlink('/cc/bc/bb/b', 'b')
  await trie.put('b', 'nicwbuvltr')             

  // Should return b/c/d -> null
  // Actually returns b/c/d -> null
  const node = await trie.get('b/c/d')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)          
  t.end()                               
})