const p = require('path')
const chalk = require('chalk')
const progress = require('cli-progress')
const { create } = require('../..')

exports.command = 'run'
exports.desc = 'Perform fuzz testing'
exports.builder = {
  config: {
    default: p.join(process.cwd(), 'fuzzing.config.js'),
    alias: 'c',
    type: 'string'
  },
  module: {
    default: p.join(process.cwd(), 'fuzzing.js'),
    alias: 'm',
    type: 'string'
  },
  iterations: {
    alias: 'i',
    type: 'number'
  },
  operations: {
    alias: 'o',
    type: 'number'
  },
  seed: {
    alias: 's',
    type: 'string'
  },
  debug: {
    alias: 'd',
    type: 'boolean'
  }
}
exports.handler = async function (argv) {
  const userFunctions = require(argv.module)

  var userConfig = require(argv.config)
  if (argv.operations) userConfig.numOperations = argv.operations
  if (argv.seed) userConfig.seed = argv.seed
  if (argv.debug) userConfig.debug = argv.debug
  if (argv.iterations) userConfig.numIterations = argv.iterations

  const { events, run } = create(userFunctions, userConfig)
  var bar = null

  if (!argv.debug) {
    bar = new progress.SingleBar()
    bar.start(argv.iterations || userConfig.iterations, 0)
    events.on('progress', () => bar.increment())
  }
  try {
    await run()
  } catch (err) {
    console.error('Fuzzing produced error:', err)
  }
  console.log('done running')
  if (bar) bar.stop()
}
