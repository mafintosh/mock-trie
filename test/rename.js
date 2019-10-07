const tape = require('tape')
const Trie = require('../trie')

tape('basic rename', function (assert) {
  const t = new Trie()

  t.put('a/b', 'a/b')
  t.rename('a', 'c')
  t.put('c/c', 'c/c')

  assert.same(t.get('c/c').value.value, 'c/c')
  assert.same(t.get('c/b').value.value, 'a/b')
  assert.same(t.get('a'), null)
  assert.same(t.get('a/b'), null)
  assert.end()
})

tape.skip('rename to longer path', function (assert) {
  const t = new Trie()

  t.put('a/b', 'a/b')
  t.rename('a', 'c/d')
  t.put('c/d/c', 'c/d/c')

  assert.same(t.get('c/d/c').value.value, 'c/d/c')
  assert.same(t.get('c/d/b').value.value, 'a/b')
  assert.same(t.get('a'), null)
  assert.same(t.get('a/b'), null)
  assert.end()
})
