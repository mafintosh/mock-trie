const test = require('tape')
const SandboxPath = require('sandbox-path')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')
const ReferenceTrie = require('./helpers/reference')
const path = new SandboxPath('/')

const KEY_CHARACTERS = 'abcd'
const VALUE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz'

class TrieFuzzer extends FuzzBuzz {
  constructor (opts) {
    super(opts)

    this.trie = new Trie()
    this.reference = new ReferenceTrie()
    this._maxComponentLength = opts.maxComponentLength || 10
    this._maxPathDepth = opts.maxPathDepth || 10
    this._syntheticKeys = opts.syntheticKeys || 0

    // TODO: Hack for simple code generation.
    this._trace = [
      'const trie = new Trie()',
      ''
    ]

    this.add(2, this.putNormalValue)
    this.add(1, this.createSymlink)
    // this.add(1, this.rename)
    // this.add(1, this.delete)
    // this.add(1, this.mount)
  }

  _generatePair (keyCharacters = KEY_CHARACTERS, valueCharacters = VALUE_CHARACTERS) {
    const generator = this.randomInt.bind(this)
    const depth = this.randomInt(this._maxPathDepth) || 1
    const value = randomString(valueCharacters, generator, 10)
    const path = new Array(depth).fill(0).map(() => {
      const length = this.randomInt(this._maxComponentLength) || 1
      return randomString(keyCharacters, generator, length)
    })
    return { path, value }
  }

  _generateRelativeSymlink () {
    const { path } = this._generatePair()
    const numRelativeIndexes = this.randomInt(path.length + 1)
    const relativeIndexes = new Array(numRelativeIndexes).fill(0).map(() => this.randomInt(path.length + 1))
    for (const index of relativeIndexes) {
      path.splice(index, 0, '..')
    }
    return path
  }

  _generateAbsoluteSymlink () {
    const { path } = this._generatePair()
    return path
  }

  async putNormalValue () {
    const { path, value } = this._generatePair()
    const key = path.join('/')
    this.debug('putting normal key/value:', key, '->', value)
    await this.trie.put(key, value)
    this._trace.push(`await trie.put(\'${key}\', \'${value}\')`)
    this.reference.put(path, value)
  }

  async createSymlink () {
    const absolute = !!this.randomInt(2)
    const { path: linknamePath } = this._generatePair()
    const targetPath = !absolute ? this._generateRelativeSymlink() : this._generateAbsoluteSymlink()
    const linkname = linknamePath.join('/')
    var target = targetPath.join('/')
    if (absolute) target = '/' + target

    this.debug(`creating ${absolute ? 'absolute' : 'relative'} symlink:`, linkname, '->', target)
    await this.trie.symlink(target, linkname)
    this._trace.push(`await trie.symlink(\'${target}\', \'${linkname}\')`)
    this.reference.symlink(targetPath, linknamePath, absolute)
  }

  async rename () {
    const { path: toPath } = this._generatePair()
    const { path: fromPath } = this._generatePair()
    const to = toPath.join('/')
    const from = fromPath.join('/')

    this.debug('renaming:', from, '->', to)
    await this.trie.rename(from, to)

    // this.trace('await trie.rename(%o, %o)', from, to)
    this._trace.push(`await trie.rename(\'${from}\', \'${to}\')`)

    this.reference.rename(fromPath, toPath)
  }

  async delete () {
    const { path } = this._generatePair()
    const key = path.join('/')

    this.debug('deleting:', key)
    await this.trie.del(key)

    // this.trace('await trie.rename(%o, %o)', from, to)
    this._trace.push(`await trie.del(\'${key}\')`)

    this.reference.delete(path)
  }

  async _validateWithSyntheticKeys (other) {
    for (let i = 0; i < this._syntheticKeys; i++) {
      const { path } = this._generatePair()
      await this.reference.validatePath(path, other)
    }
  }

  async _validate () {
    console.log('VALIDATING AGAINST REFERENCE')
    this.debug('validating against reference:\n', await this.reference.print())
    try {
      await this.reference.validateAllReachable(this.trie)
      await this._validateWithSyntheticKeys(this.trie)
    } catch (err) {
      if (!err.mismatch) throw err
      const { key, value, expectedKey, expectedValue } = err.mismatch

      const testBody = [
        ...this._trace,
        '',
        `// Should return ${expectedKey} -> ${expectedValue}`,
        `// Actually returns ${key} -> ${value}`,
        `const node = await trie.get('${expectedKey || key}')`,
        `const value = (node && node.value) ? node.value.value : null`,
        `t.same(value, ${expectedValue ? `'${expectedValue}'` : null})`,
        `t.end()`
      ].join('\n  ')
      const replBody = [
        ...this._trace,
        'return trie'
      ].join('\n  ')

      const testRequires = 'const test = require(\'tape\')\nconst Trie = require(\'../../trie\')\n\n'
      const replRequires = 'const Trie = require(\'./trie\')\n\n'
      const referenceRequires = 'const Trie = require(\'./test/helpers/reference\')\n\n'
      const testCase = `${testRequires}test(\'failing autogenerated test case\', async t => {\n  ${testBody} \n})`
      const replScript = `${replRequires}var trie = null\n(async () => {\n  ${replBody} \n})().then(t => trie = t) \n`
      const referenceScript = `${referenceRequires}var trie = null\n(async () => {\n  ${replBody} \n})().then(t => trie = t) \n`

      err.testCase = testCase
      err.replScript = replScript
      err.referenceScript = referenceScript
      throw err
    }
  }
}

function run (numTests, numOperations) {
  test(`${numTests} runs with ${numOperations} fuzz operations each`, async t => {
    var error = null
    try {
      for (let i = 0; i < numTests; i++) {
        const fuzz = new TrieFuzzer({
          seed: `hypertrie-${i}`,
          debugging: true,
          maxComponentLength: 5,
          maxPathDepth: 4,
          syntheticKeys: 2000
        })
        await fuzz.run(numOperations)
      }
    } catch (err) {
      error = err
      console.log('TRACE:', error.stack)
      t.fail(error)
      if (error.testCase) {
        console.error('\nFailing Test:\n')
        console.error(error.testCase)
        console.error()
      }
      if (error.replScript) {
        console.error('Generate Trie in REPL:\n')
        console.error(error.replScript)
        console.error()
      }
      if (error.referenceScript) {
        console.error('Generate Reference in REPL:\n')
        console.error(error.referenceScript)
        console.error()
      }
    }
    if (error) t.fail('fuzzing failed')
    else t.pass('fuzzing succeeded')
    t.end()
  })
}

run(1000, 3)

function randomString (alphabet, generator, length) {
  var s = ''
  for (let i = 0; i < length; i++) {
    s += alphabet[generator(alphabet.length) || 1]
  }
  return s
}
