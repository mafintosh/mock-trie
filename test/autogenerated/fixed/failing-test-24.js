const test = require('tape')
const Trie = require('../../..')
                         
test('failing autogenerated test case', async t => {
  const trie = new Trie()     
                                       
  await trie.rename('dc', 'c')      
  await trie.symlink('bd/bd/..', 'b/b')
  await trie.put('dc', 'jqvrwtsihr')

  // Should return null -> null
  // Actually returns c -> jqvrwtsihr
  const node = await trie.get('c')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)                                                           
  t.end()    
})
