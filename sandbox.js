const MockTrie = require('./')

const t = new MockTrie()

t.put('a', JSON.stringify({ actual: 'a' }))
t.put('b', JSON.stringify({ actual: 'b', symlink: 'a' }))
t.put('c', '{"actual": "c"}')
t.put('d', JSON.stringify({ actual: 'd', symlink: 'b' }))
t.put('e', '{"actual":"e"}')

function get (key) {
  const c = new MockTrie.Controller({
    onclosest (node) {
      const val = JSON.parse(node.value)

      if (val.symlink && node.key.equals(c.target.key)) {
        c.reset()
        c.setFeed(t.feed)
        c.setTarget(val.symlink)
        return null
      }

      return node
    },
    prereturn (node) {
      node.key = key
      return node
    }
  })

  c.setFeed(t.feed)
  c.setTarget(key)

  return c.update()
}

console.log(get('d'))

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
