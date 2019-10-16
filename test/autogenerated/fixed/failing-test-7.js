const test = require('tape')
const Trie = require('../../../trie')        
                                         
test('failing autogenerated test case', async t => {
  const trie = new Trie()             
                                     
  await trie.symlink('bc/bcd/../..', 'c')
  await trie.put('b/db', 'kbdxnfkrqq')
  await trie.put('cbbb', 'xkicfzdzep')
     
  // Should return cbbb -> xkicfzdzep
  // Actually returns null -> null                                              
  const node = await trie.get('cbbb')
  const value = (node && node.value) ? node.value.value : null
  t.same(value, 'xkicfzdzep')
  t.end()
})                                                                                                 