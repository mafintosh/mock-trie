const MockTrie = require('./')
const Trie = require('./trie')

const m = new MockTrie()

m.put('a', JSON.stringify({ actual: 'a', actualTrie: 'm' }))

const t = new Trie()
let debug = false

t.put('a', { actual: 'a' })
t.put('a/b', { actual: 'a/b' })
t.put('foo', { actual: 'foo' })
t.put('b', { actual: 'b', symlink: 'a' })
t.put('b1', { actual: 'b1', mount: 'm' })
t.put('r', { actual: 'r', rename: 'a' })
t.put('a', { actual: 'a', deletion: true })
t.put('a', { actual: 'a*' })
t.put('a/c', { actual: 'a/c' })
t.put('r/d', { actual: 'r/d' })
// put('bar', { actual: 'bar' })

console.log('r/b ->', t.get('r/b'))
console.log('r ->', t.get('r'))

// console.log(t)
console.log('a/c ->', t.get('a/c'))
console.log('a ->', t.get('a'))
console.log('b ->', t.get('b'))
console.log('foo ->', t.get('foo'))
console.log('a/b ->', t.get('a/b'))

// t.put('a', JSON.stringify({ actual: 'a' }))
// t.put('a/b', JSON.stringify({ actual: 'a/b' }))
// t.put('foo', JSON.stringify({ actual: 'foo' }))
// t.put('b', JSON.stringify({ actual: 'b', symlink: 'a' }))
// t.put('b1', JSON.stringify({ actual: 'b1', mount: 'm' }))
// t.put('r', JSON.stringify({ actual: 'r', rename: 'a' }))
// t.put('a', JSON.stringify({ actual: 'a', deletion: true }))
// t.put('r/foo', JSON.stringify({ actual: 'r/foo' }))


// t.put('c', '{"actual": "c"}')
// t.put('d', JSON.stringify({ actual: 'd', symlink: 'b' }))
// t.put('e', '{"actual":"e"}')

// console.log(get('r/b'))
// console.log(t)
// console.log(get('a'))

// for (let i = 0; i < 1000; i++) {
//   t.put('a' + i, 'val')
// }

// console.log(t)
// console.log(t.get('a42'))

// const controller = t.controller()
// controller.setTarget('a42')
// controller.on('node', node => {
//   controller.setTarget('a43')
// })

/*
t.put('hi', 'val')
t.put('ho', 'val')
t.put('fooo', 'val')
t.put('bar', 'val')

console.log(t)

console.log(t.get('hi'))
console.log(t.get('ho'))

const controller = new Controller()

controller.setTrie(trie)

controller.onnode = function (node, cb) {
  controller.setTarget('new target')
  process.nextTick(cb)
}
controller.prereturn = function (node, cb) {

}
*/

/*
const c = new GetController(head, {
  onclosest (node) {

  },
  onseq (seq, cb) {
    feed.get(seq, cb)
  }
})

c.execute(function (err, node) {

})

const c = new PutController(head, {
  onclosest (node) {

  },
  onseq (seq, cb) {
    feed.get(seq, cb)
  }
})

const c = new IterateController(head, {
  onclosest (node) {

  },
  onseq (seq, cb) {
    feed.get(seq, cb)
  }
})

const c = new DeleteController(head, {
  onclosest (node) {

  },
  onseq (seq, cb) {
    feed.get(seq, cb)
  }
})
*/
