const MockTrie = require('..')
console.log(MockTrie)
const m = new MockTrie()

m.put('a', 'a')
m.put('b', 'b')
m.put('a/c', 'a/c')
m.put('a/c/e', 'a/c/e')
m.put('a/c/e/g', 'a/c/e/g')
m.put('a/c/f/h', 'b/d/f/h')
m.put('a/d', 'a/d')
m.put('a/d/f/h', 'a/d/f/h')
m.put('a/d/f', 'a/d/f')
m.put('a/d/f/i', 'b/d/f/i')



console.log(m)

const n = new MockTrie()

n.put('a', 'a')
n.put('b', 'b')
n.put('ac', 'ac')
n.put('ad', 'ad')
n.put('ace', 'ace')
n.put('adf', 'adf')
n.put('aceg', 'aceg')
n.put('adfh', 'adfh')

console.log(n)

