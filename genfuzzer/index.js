const p = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { EventEmitter } = require('events')

const test = require('tape')
const tmp = require('tmp')
const deepmerge = require('deepmerge')
const FuzzBuzz = require('fuzzbuzz')

const defaults = require('./defaults')

class TraceExecutor {
  constructor (trace, debug) {
    this._trace = trace
    this.debug = debug
  }

  get trace () {
    return this._trace
  }

  async _exec (inputs, op) {
    if (!inputs) inputs = op.inputs()
    await op.operation(...inputs)
    return inputs
  }

  async pushAndExecute (name, op) {
    const inputs = await this._exec(null, op)
    if (this.debug) this.debug(`executing ${name}(${JSON.stringify(inputs)})`)
    this._trace.push({ inputs, op })
  }

  async replay () {
    for (const { inputs, op } of this._trace) {
      await this._exec(inputs, op)
    }
  }
}

class GenericFuzzer extends EventEmitter {
  constructor (userFunctions, opts = {}) {
    super()
    this.opts = opts
    this.seed = this.opts.seed
    this.fuzzer = new FuzzBuzz({
      seed: this.seed,
      debugging: this.opts.debug,
      validate: this.validate.bind(this)
    })

    this.rng = this.fuzzer.randomInt.bind(this.fuzzer)
    this.debug = this.fuzzer.debug.bind(this.fuzzer)

    this.executor = new TraceExecutor([], this.debug)
    this._userFunctions = userFunctions

    this.actual = null
    this.reference = null
    this.state = null
    this.operations = null
    this.validation = null
  }

  _wrapOperation (name, op) {
    return async () => {
      this.executor.pushAndExecute(name, op)
      this.emit('progress')
    }
  }

  async _setup () {
    const { actual, reference, state } = await this._userFunctions.setup()
    const operations = this._userFunctions.operations(reference, actual, this.rng, this.opts)
    const validation = this._userFunctions.validation(reference, actual, this.rng, this.opts)
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
      this.fuzzer.add(config.weight, this._wrapOperation(name, operation))
    }
  }

  run () {
    try {
      return this.fuzzer.run(this.opts.numOperations)
    } catch (err) {
      return this.shorten(err)
    }
  }

  async shorten (err) {
    this.debug(`attempting to shorten the trace with a maximum of ${this.opts.shortening.iterations} mutations`)
    const testName = err[GenericFuzzer.TestName]
    const testArgs = err[GenericFuzzer.TestArgs]

    var shortestTrace = [ ...this.executor.trace() ]
    var numShortenings = 0
    var numIterations = 0

    const stack = shortestTrace.map((_, i) => { return { i, trace: shortestTrace } })

    while (stack.length && numIterations < this.opts.shortening.iterations) {
      const { i, trace } = stack.pop()
      if (!trace.length) continue

      const nextTrace = [ ...trace ]
      nextTrace.splice(i, 1)

      const { actual, reference, state, operations, validation } = await this._setup()
      const executor = new TraceExecutor(nextTrace)
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
    return {
      trace: shortestTrace,
      testName,
      testArgs
    }
  }

  async validate () {
    if (!this.validation.validators) return
    const self = this

    for (const name of Object.keys(this.validation.validators)) {
      const validator = this.validation.validators[name]
      const test = this.validation.tests[validator.test]
      var testArgs = null
      const wrappedTest = function () {
        testArgs = arguments
        self.debug(`in validator ${name}, testing ${validator.test}(${JSON.stringify([...testArgs])})`)
        return test(...arguments)
      }
      try {
        this.debug(`validating with validator: ${name}`)
        await validator.operation(wrappedTest)
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

GenericFuzzer.TestName = Symbol('test-name')
GenericFuzzer.TestArgs = Symbol('test-args')
GenericFuzzer.TestFunction = Symbol('test-function')
GenericFuzzer.Description = Symbol('description')
GenericFuzzer.Trace = Symbol('trace')

function create (userFunctions, userConfig) {
  const opts = deepmerge(defaults, userConfig)
  const startingSeed = opts.randomSeed ? crypto.randomBytes(16).toString('hex') : opts.seed
  var events = new EventEmitter()

  return { events, run }

  async function run () {
    for (let i = 0; i < opts.numIterations; i++) {
      const fuzzer = new GenericFuzzer(userFunctions, {
        ...userConfig,
        seed: startingSeed + (i ? '' + i : '')
      })
      await fuzzer.setup()
      // TODO: Hack to enable exiting on ctrl+c
      await new Promise(resolve => setImmediate(resolve))
      await fuzzer.run()
      events.emit('progress')
    }
  }
}

module.exports = {
  GenericFuzzer,
  create
}
