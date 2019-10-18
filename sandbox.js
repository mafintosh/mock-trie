const Trie = require('./trie')

const t = new Trie()
let debug = false

t.put('a', 'a')
t.put('a/b', 'a/b' )
t.put('foo', 'foo')
t.put('b', 'a*')
t.put('b/c','a/c')
t.rename('b', 'r')
t.put('r/d', 'r/d')
t.rename('r', 'renamed/d')
t.symlink('/renamed', 'foo')
t.symlink('/foo', 'x/y/z')
t.put('1/1/1/1/1', '...')
// t.symlink('/', 'loop')

const stack = []

const c = t.iterator('renamed')

while (true) {
  const node = c.next()
  console.log(node)
  if (!node) return
}
