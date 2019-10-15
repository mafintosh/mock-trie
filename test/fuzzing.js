const p = require('path')
const fs = require('fs')
const test = require('tape')
const tmp = require('tmp')
const SandboxPath = require('sandbox-path')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')
const ReferenceTrie = require('./helpers/reference')
const path = new SandboxPath('/')

const SCAFFOLD_PATH = p.join(__dirname, 'helpers', 'scaffold.js.template')
const KEY_CHARACTERS = 'abcd'
const VALUE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz'
const SCAFFOLD = fs.readFileSync(SCAFFOLD_PATH, { encoding: 'utf8' })

class TrieFuzzer extends FuzzBuzz {
  constructor (opts) {
    super(opts)

    this.trie = new Trie()
    this.reference = new ReferenceTrie()
    this._maxComponentLength = opts.maxComponentLength || 10
    this._maxPathDepth = opts.maxPathDepth || 10
    this._syntheticKeys = opts.syntheticKeys || 0
    this._shorteningIterations = opts.shorteningIterations || 0

    this._trace = []

    this.add(2, this.putNormalValue)
    this.add(1, this.createSymlink)
    this.add(1, this.rename)
    // this.add(1, this.delete)
    // this.add(1, this.mount)
  }

  _generatePair (keyCharacters = KEY_CHARACTERS, valueCharacters = VALUE_CHARACTERS) {
    const generator = this.randomInt.bind(this)
    const depth = this.randomInt(this._maxPathDepth + 1) || 1
    const value = randomString(valueCharacters, generator, 10)
    const path = new Array(depth).fill(0).map(() => {
      const length = this.randomInt(this._maxComponentLength + 1) || 1
      return randomString(keyCharacters, generator, length)
    })
    return { path, value }
  }

  _generateRelativeSymlink () {
    const { path } = this._generatePair()
    const numRelativeIndexes = this.randomInt(path.length / 2 + 1)
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
    const op = { type: 'put', args: [key, value] }
    await this._executeOp(op, this.trie, this.reference)
    this._trace.push(op)
  }

  async createSymlink () {
    const absolute = !!this.randomInt(2)
    const { path: linknamePath } = this._generatePair()
    const targetPath = !absolute ? this._generateRelativeSymlink() : this._generateAbsoluteSymlink()
    const linkname = linknamePath.join('/')
    var target = targetPath.join('/')
    if (absolute) target = '/' + target

    this.debug(`creating ${absolute ? 'absolute' : 'relative'} symlink:`, linkname, '->', target)
    const op = { type: 'symlink', args: [target, linkname] }
    await this._executeOp(op, this.trie, this.reference)
    this._trace.push(op)
  }

  async rename () {
    const { path: toPath } = this._generatePair()
    const { path: fromPath } = this._generatePair()
    const to = toPath.join('/')
    const from = fromPath.join('/')

    this.debug('renaming:', from, '->', to)
    const op = { type: 'rename', args: [from, to] }
    await this._executeOp(op, this.trie, this.reference)
    this._trace.push(op)
  }

  async delete () {
    const { path } = this._generatePair()
    const key = path.join('/')

    this.debug('deleting:', key)
    const op = { type: 'del', args: [key] }
    await this._executeOp(op, this.trie, this.reference)
    this._trace.push(op)
  }

  async _apply (op, trie) {
    switch (op.type) {
      case 'put':
        return trie.put.apply(trie, op.args)
      case 'del':
        return trie.del.apply(trie, op.args)
      case 'symlink':
        return trie.symlink.apply(trie, op.args)
      case 'rename':
        return trie.rename.apply(trie, op.args)
      default:
        throw new Error('Unrecognized operation')
    }
  }

  _executeOp (op, trie, reference) {
    return Promise.all([
      this._apply(op, trie),
      this._apply(op, reference)
    ])
  }

  async _executeOps (ops, trie, reference) {
    for (const op of ops) {
      await this._executeOp(op, trie, reference)
    }
  }

  async _validateWithSyntheticKeys () {
    for (let i = 0; i < this._syntheticKeys; i++) {
      const { path } = this._generatePair()
      await this.reference.validatePath(path, this.trie)
    }
  }

  async _shortenTestCase (expectedKey, expectedValue, actualKey, actualValue) {
    this.debug(`attempting to shorten the trace with ${this._shorteningIterations} mutations`)
    var shortestTrace = [ ...this._trace ]
    var numShortenings = 0
    for (let i = 0; i < this._shorteningIterations; i++) {
      const newTrie = new Trie()
      const newReference = new ReferenceTrie()
      const removalIndex = this.randomInt(shortestTrace.length)
      const nextTrace = [ ...shortestTrace ]
      nextTrace.splice(removalIndex, 1)
      await this._executeOps(nextTrace, newTrie, newReference)
      try {
        await newReference.validatePath(expectedKey || actualKey, newTrie)
      } catch (err) {
        if (!err.mismatch) throw err
        const {
          actualKey: newActualKey,
          actualValue: newActualValue,
          expectedKey: newExpectedKey,
          expectedValue: newExpectedValue
        } = err.mismatch
        if (actualKey === newActualKey && expectedKey === newExpectedKey &&
            expectedValue === newExpectedValue && actualValue === newActualValue) {
          shortestTrace = nextTrace
          numShortenings++
        }
      }
    }
    this.debug(`shortened the trace by ${numShortenings} operations`)
    return shortestTrace
  }

  _generateTestCase (trace, expectedKey, expectedValue, actualKey, actualValue) {
    const replacements = new Map([
      ['operations', trace.map(t => `  await trie.${t.type}(${t.args.map(a => `'${a}'`).join(',')})`).join('\n')],
      ['expectedKey', expectedKey || actualKey],
      ['expectedValue', expectedValue],
      ['expectedValueArg', expectedValue ? `'${expectedValue}'` : null],
      ['actualValue', actualValue]
    ])
    var testCase = SCAFFOLD
    for (const [name, value] of replacements) {
      testCase = testCase.replace(new RegExp(`\{\{ ${name} \}\}`, 'g'), value)
    }
    return testCase
  }

  async _validate () {
    this.debug('validating against reference:\n', await this.reference.print())
    try {
      await this.reference.validateAllReachable(this.trie)
      await this._validateWithSyntheticKeys()
    } catch (err) {
      if (!err.mismatch) throw err
      const { actualKey, actualValue, expectedKey, expectedValue } = err.mismatch

      const minimalTrace = await this._shortenTestCase(expectedKey, expectedValue, actualKey, actualValue)
      err.testCase = this._generateTestCase(minimalTrace, expectedKey, expectedValue, actualKey, actualValue)

      throw err
    }
  }
}

function run (numTests, numOperations, singleSeed) {
  test(`${numTests} runs with ${numOperations} fuzz operations each`, async t => {
    var error = null
    try {
      if (!singleSeed) {
        for (let i = 0; i < numTests; i++) {
          // TODO: Adding this slight delay prevents the event loop from saturating and allows us to exit with Ctrl+c
          await new Promise(resolve => setImmediate(resolve))
          await fuzz(i)
        }
      } else {
        await fuzz(singleSeed)
      }
    } catch (err) {
      error = err
      t.fail(err)
      if (error.testCase) {
        console.error('\nFailing Test:\n')
        console.error(err.testCase + '\n')
        try {
          const testPath = await writeTestCase(err.testCase)
          console.error(`Failing test written to ${testPath}`)
          console.error('Copy this file into your test/autogenerated directory before running.\n')
        } catch (err) {
          console.error('Could not write test file:', err)
        }
      }
    }
    if (error) t.fail('fuzzing failed')
    else t.pass('fuzzing succeeded')
    t.end()
  })

  function fuzz (seed) {
    const opts = {
      seed: `hypertrie-${seed}*`,
      debugging: true,
      maxComponentLength: 2,
      maxPathDepth: 5,
      syntheticKeys: 3000,
      shorteningIterations: 10000,
      numOperations
    }
    if (opts.debug) console.log('fuzzing with options:', opts)
    const tester = new TrieFuzzer(opts)
    return tester.run(opts.numOperations)
  }
}

//run(6000, 15)
run(1000, 15, 469)

async function writeTestCase (testCase) {
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: '.js' }, (err, path) => {
      if (err) return reject(err)
      fs.writeFile(path, testCase, { encoding: 'utf8' }, err => {
        if (err) return reject(err)
        return resolve(path)
      })
    })
  })
}

function randomString (alphabet, generator, length) {
  var s = ''
  for (let i = 0; i < length; i++) {
    s += alphabet[generator(alphabet.length) || 1]
  }
  return s
}
