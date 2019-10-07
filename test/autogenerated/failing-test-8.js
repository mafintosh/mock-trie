const test = require('tape')
const Trie = require('../../trie')    
                                  
test('failing autogenerated test case', async t => {
  const trie = new Trie()            
                                   
  await trie.put('c', 'rkifelwodi')
  await trie.symlink('/c', 'b/bc')
  await trie.symlink('ccbb/..', 'cb')
     
  // Should return null -> null
  // Actually returns cb/c -> rkifelwodi                                        
  const node = await trie.get('cb/c')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, null)
  t.end()
})   
