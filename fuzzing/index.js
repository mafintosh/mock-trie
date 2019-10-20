const p = require('path')
const fs = require('fs')
const test = require('tape')
const tmp = require('tmp')
const deepmerge = require('deepmerge')
const SandboxPath = require('sandbox-path')
const FuzzBuzz = require('fuzzbuzz')

const Trie = require('../trie')
const ReferenceTrie = require('./reference')
const path = new SandboxPath('/')

const defaults = require('./defaults')

const TEST_ARGS = new Symbol('test-args')
const TEST_NAME = new Symbol('test-name')

class TraceExecutor {
  constructor (trace) {
    this.trace = trace
  }

  get trace () {
    return this.trace
  }

  async _exec (inputs, op) {
    if (!inputs) inputs = op.inputs()
    await op.operation(...inputs)
    return inputs
  }

  async pushAndExecute (op) {
    const inputs = await this._exec(null, op)
    this.trace.push({ inputs, op })
  }

  async replay () {
    for (const { inputs, op } of this.trace) {
      await this._exec(inputs, op)
    }
  }
}

class GenericFuzzer {
  constructor (userConfig, opts = {}) {
    this.fuzzer = new FuzzBuzz({
      validate: this.validate.bind(this)
    })
    this.rng = this.fuzzer.randomInt.bind(this.fuzzer)
    this.debug = this.fuzzer.debug.bind(this.fuzzer)

    this.executor = new TraceExecutor([])
    this.opts = deepmerge(defaults, opts)
    this._userConfig = userConfig

    this.actual = null
    this.reference = null
    this.state = null
    this.operations = null
    this.validation = null
  }

  _wrapOperation (op) {
    return async () => {
      this.executor.pushAndExecute(op)
    }
  }

  async _setup () {
    const { actual, reference, state } = await this._userConfig.setup()
    const operations = this._userConfig.operations(reference, actual, this.rng, this.opts)
    const validation = this._userConfig.validation(reference, actual, this.rng, this.opts)
    return { actual, reference, state, operations, validation }
  }

  async setup () {
    const { actual, reference, state, operations, validation } = await this._setup()
    this.actual = actual
    this.reference = reference
    this.state = state
    this.operations = operations
    this.validation = validation

    for (const name of Object.keys(this.operations)) {
      const operation = this.operations[name]
      const config = this.opts.operations[name]
      if (!config) {
        console.warn(`Skipping operation ${name} because it does not have a valid configuration`)
        continue
      } else if (!config.enabled) {
        this.debug(`Skipping operation ${name} because it is disabled.`)
        continue
      }
      this.fuzzer.add(config.weight, this._wrapOperation(operation))
    }
  }

  run () {
    try {
      this.fuzzer.run(this.opts.global.iterations)
    } catch (err) {
      return this.shorten(err)
    }
  }

  async shorten (err) {
    this.debug(`attempting to shorten the trace with a maximum of ${this.opts.shortening.iterations} mutations`)
    var shortestTrace = [ ...this.executor.trace() ]
    var numShortenings = 0
    var numIterations = 0
    const stack = shortestTrace.map((_, i) => { return { i, trace: shortestTrace } })
    const visited = new Set()

    while (stack.length && numIterations < this._maxShorteningIterations) {
      const { i, trace } = stack.pop()
      if (!trace.length) continue

      const nextTrace = [ ...trace ]
      nextTrace.splice(i, 1)

      const { actual, reference, state, operations, validation } = await this._setup()
      const executor = new TraceExecutor(nextTrace)
      const testName = err[GenericFuzzer.TestName]
      const testArgs = err[GenericFuzzer.TestArgs]
      const test = validation.tests[testName]

      await executor.replay()

      try {
        await test(...testArgs)
      } catch (err) {
        // Throw if the error was not an expected validation error.
        if (!err[GenericFuzzer.TestName]) throw err
        if (nextTrace.length < shortestTrace.length) {
          stack.push(...nextTrace.map((_, i) => { return { i, trace: nextTrace } }))
          shortestTrace = nextTrace
          numShortenings++
        }
      }
      numIterations++
    }

    this.debug(`shortened the trace by ${numShortenings} operations`)
    return shortestTrace
  }

  async validate () {
    if (!this.validation.validators) return
    for (const name of Object.keys(this.validation.validators)) {
      const validator = this.validation.validators[name]
      const test = this.validation.tests[validator.test]
      var testArgs = null
      const wrappedTest = function () {
        testArgs = arguments
        return test(...arguments)
      }
      try {
        this.debug(`validating with validator: ${name}`)
        await validator(wrappedTest)
      } catch (err) {
        err[GenericFuzzer.TestArgs] = testArgs
        err[GenericFuzzer.TestName] = validator.test
        err[GenericFuzzer.Description] = err.message
        err[GenericFuzzer.TestFunction] = test
        throw err
      }
    }
  }
}

GenericFuzzer.TestName = new Symbol('test-name')
GenericFuzzer.TestArgs = new Symbol('test-args')
GenericFuzzer.TestFunction = new Symbol('test-function')
GenericFuzzer.Description = new Symbol('description')
GenericFuzzer.Trace = new Symbol('trace')

class TrieFuzzer extends FuzzBuzz {
  constructor (opts) {
    super(opts)

    this.trie = new Trie()
    this.reference = new ReferenceTrie()

    this.operations = new Operations(this, this.trie, this.reference, opts)
    this.validator = new Validator(this, this.trie, this.reference, opts)

    this._syntheticKeys = opts.syntheticKeys || 0
    this._maxShorteningIterations = opts.maxShorteningIterations || 0

    this.add(2, this.putNormalValue)
    this.add(1, this.createSymlink)
    this.add(1, this.rename)
    this.add(1, this.delete)
    // this.add(1, this.mount)
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

  async _validateWithSyntheticKeys () {
    for (let i = 0; i < this._syntheticKeys; i++) {
      const { path } = this._generatePair()
      await this.reference.validatePath(path, this.trie)
    }
  }

  async _validateWithIterators () {
    for (let i = 0;  i < this._syntheticIterators; i++) {
      const { path: prefix } = this._generatePair()
      const recursive = !!this.randomInt(1)
      const gt = !!this.randomInt(1)
      await this.reference.validateIterator(prefix, this.trie, { recursive, gt })
    }
  }

  async _shortenTestCase (expectedKey, expectedValue, actualKey, actualValue) {
    this.debug(`attempting to shorten the trace with a maximum of ${this._maxShorteningIterations} mutations`)
    if (!expectedKey) throw new Error('Expected key in reference trie is null')

    var shortestTrace = [ ...this._trace ]
    var numShortenings = 0
    var numIterations = 0
    const stack = shortestTrace.map((_, i) => { return { i, trace: shortestTrace } })
    const visited = new Set()

    while (stack.length && numIterations < this._maxShorteningIterations) {
      const { i, trace } = stack.pop()
      if (!trace.length) continue

      const nextTrace = [ ...trace ]
      nextTrace.splice(i, 1)

      const newTrie = new Trie()
      const newReference = new ReferenceTrie()
      await this._executeOps(nextTrace, newTrie, newReference)

      try {
        await newReference.validatePath(expectedKey, newTrie)
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
          if (nextTrace.length < shortestTrace.length) {
            stack.push(...nextTrace.map((_, i) => { return { i, trace: nextTrace } }))
            shortestTrace = nextTrace
            numShortenings++
          }
        }
      }
      numIterations++
    }

    this.debug(`shortened the trace by ${numShortenings} operations`)
    return shortestTrace
  }

  _generateTestCase (trace, expectedKey, expectedValue, actualKey, actualValue) {
    const replacements = new Map([
      ['operations', trace.map(t => `  await trie.${t.type}(${t.args.map(a => `'${a}'`).join(',')})`).join('\n')],
      ['expectedKey', expectedKey],
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
      await this._validateWithIterators()
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
      maxShorteningIterations: 10000000,
      numOperations
    }
    if (opts.debug) console.log('fuzzing with options:', opts)
    const tester = new TrieFuzzer(opts)
    return tester.run(opts.numOperations)
  }
}

const iterations = argv.iterations || argv.i || 6000
const operations = argv.operations || argv.o || 15
const seed = argv.seed || argv.s || null
run(iterations, operations, seed)

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
