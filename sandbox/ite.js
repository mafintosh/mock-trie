const Trie = require('..')

const t = new Trie()
let debug = false

// t.put('a', 'a')
// t.put('a/b', 'a/b' )
// t.put('foo', 'foo')
// t.put('b', 'a*')
// t.put('b/c','a/c')
// t.rename('b', 'r')
// t.put('r/d', 'r/d')
// t.rename('r', 'renamed/d')
// t.symlink('/renamed', 'foo')
// t.symlink('/foo', 'x/y/z')
// t.put('1/1/1/1/1', '...')
// // t.symlink('/', 'loop')

t.put("c/bc/dbb/d","pljeqhtgud")
t.put("a","pljeqhtgud")
t.rename('a', 'foo/bar')
t.rename('foo/bar', 'c/a')

const stack = []

const c = t.iterator('c', { recursive: false })

c.next(function loop (err, node) {
  if (!node) return
  console.log(node)
  c.next(loop)
})
