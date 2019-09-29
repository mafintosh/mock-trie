const MockTrie = require('./')

const t = new MockTrie()

t.put('hi', 'val')
t.put('ho', 'val')
t.put('fooo', 'val')
t.put('bar', 'val')

console.log(t)

console.log(t.get('hi'))
console.log(t.get('ho'))
