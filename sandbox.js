const MockTrie = require('./')

const m = new MockTrie()

m.put('a', JSON.stringify({ actual: 'a', actualTrie: 'm' }))

const t = new MockTrie()
let debug = false

put('a', { actual: 'a' })
put('a/b', { actual: 'a/b' })
put('foo', { actual: 'foo' })
put('b', { actual: 'b', symlink: 'a' })
put('b1', { actual: 'b1', mount: 'm' })
put('r', { actual: 'r', rename: 'a' })
put('a', { actual: 'a', deletion: true })
put('a', { actual: 'a*' })
put('a/c', { actual: 'a/c' })
put('r/d', { actual: 'r/d' })
// put('bar', { actual: 'bar' })

console.log('r/b ->', get('r/b'))
console.log('r ->', get('r'))

// console.log(t)
console.log('a/c ->', get('a/c'))
console.log('a ->', get('a'))
console.log('b ->', get('b'))
console.log('foo ->', get('foo'))
console.log('a/b ->', get('a/b'))

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

function redirectTo (target, node, rename) {
  const t = target.key.toString()
  const n = node.key.toString()

  return t.replace(n, rename)
}

function put (key, val) {
  const maxI = val.deletion ? key.split('/').length * 32 : Infinity

  const c = new MockTrie.PutController({
    onlink (i, val, seq) {
      if (i >= maxI) return false
      return true
    },
    onnode (node) {
      // if (val.deletion) {
      //   // if (node.key.toString().startsWith(key.toString())) {
      //   //   return null
      //   // }
      // }
      if (debug) console.log('node:', node)
      return node
    },
    onclosest (node) {
      if (!node) return node

      if (debug) console.log('closest:', node)

      const v = JSON.parse(node.value)

      if (v.rename) {
        const key = redirectTo(c.target, node, v.rename)
        c.setTarget(key)
        return node
      }
      // const key = (c.target.key.toString().replace(node.key.toString(), val.rename) || '/')

      return node
    }
  })

  c.setFeed(t.feed)
  c.setTarget(key)
  c.setValue(JSON.stringify(val))

  return c.update()
}

function get (key) {
  const c = new MockTrie.GetController({
    onnode (node) {
      if (debug) console.log(node)

      // if (c.head && JSON.parse(c.head.value).deletion) {
      //   // console.log('head is', c.head, c.i)
      //   if (c.i === 32) return null
      // }

      const val = JSON.parse(node.value)

      return node
    },

    onclosest (node) {
      if (!node) return null

      const val = JSON.parse(node.value)

      if (val.rename) {
        const key = (c.target.key.toString().replace(node.key.toString(), val.rename) || '/')
        c.setTarget(key)
        return node
      }

      if (val.mount) { // and validate prefix
        const key = (c.target.key.toString().replace(node.key.toString(), '') || '/').replace('/', '')
        c.reset()
        c.setFeed(m.feed)
        c.setTarget(key)
        return null
      }

      if (val.deletion) {
        return null
      }

      if (val.symlink && node.key.equals(c.target.key)) {
        c.reset()
        c.setFeed(t.feed)
        c.setTarget(val.symlink)
        return null
      }

      return node
    },
    finalise (node) {
      node.key = key
      return node
    }
  })

  c.setFeed(t.feed)
  c.setTarget(key)

  return c.update()
}

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
