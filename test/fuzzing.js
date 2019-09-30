const test = require('tape')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')

const MAX_PATH_DEPTH = 10
const MAX_COMPONENT_LENGTH = 10
const CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'

class ReferenceTrie {
  constructor () {
    this.keys = new Map()
    this.symlinks = new Map()
    this.renames = new Map()
  }
  put (key, value) {

  }
  symlink (target, linkname) {

  }
  rename (from, to) {

  }
  validate (other) {

  }
}

class TrieFuzzer extends FuzzBuzz {
  constructor (opts) {
    super(opts)

    this.trie = new Trie()
    this.reference = new ReferenceTrie()

    this.add(1, this.putNormalValue)
    this.add(1, this.createSymlink)
    this.add(1, this.rename)
  }

  async _validate () {
    return this.reference.validate(this.trie)
  }
}

test('10000 fuzz operations', async t => {
  t.plan(1)

  const fuzz = new TrieFuzzer({
    seed: 'hypertrie',
    debugging: true
  })

  try {
    await fuzz.run(10000)
    t.pass('fuzzing succeeded')
  } catch (err) {
    t.error(err, 'no error')
  }
})
