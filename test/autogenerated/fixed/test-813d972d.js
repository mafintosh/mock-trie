const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.symlink("/bbc","d")
  await op.symlink("c/b/..","d/bdd")
  await op.symlink("b/../bdd/c/b","d/c")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test("Cannot read property 'length' of null", async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("bbc",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      console.log(err)
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, "Cannot read property 'length' of null")
    }
    t.end()
  })
}

const config = {
 "seed": "fuzzing-",
 "numIterations": 10000,
 "numOperations": 100,
 "shortening": {
  "iterations": 1000000
 },
 "inputs": {
  "maxComponentLength": 3,
  "maxPathDepth": 4
 },
 "operations": {
  "put": {
   "enabled": true,
   "weight": 2
  },
  "symlink": {
   "enabled": true,
   "weight": 1
  },
  "rename": {
   "enabled": true,
   "weight": 1
  },
  "delete": {
   "enabled": true,
   "weight": 1
  }
 },
 "validation": {
  "reachable": {
   "enabled": true
  },
  "syntheticKeys": {
   "enabled": true,
   "keys": 2000
  },
  "iterators": {
   "enabled": true,
   "keys": 200,
   "recursive": true,
   "gt": false
  }
 },
 "seedNumber": 62
}

module.exports = {
  runTests,
  getObjects,
  config,
}
if (require.main && !process.env['FUZZ_DISABLE_TEST']) {
  runTests()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE 813d972dc4a94febd59a890a9eb1ee8f0d99236d60990bdc382ab29be7c45acb
// @FUZZ_TIMESTAMP Tue Nov 12 2019 19:13:01 GMT+0100 (Central European Standard Time)
