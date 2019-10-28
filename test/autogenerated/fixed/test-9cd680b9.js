const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("c/d","blvswbiftl")
  await op.symlink("/c","c/b")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key c/b/d', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("c",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key c/b/d')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie22",
 "numIterations": 2000,
 "numOperations": 30,
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
 }
},
}
if (require.main && !process.env['FUZZ_DISABLE_TEST']) {
  runTests()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE 9cd680b97f12a56bcb07089fefc4011dbaa843da385e8c24df7ae59a22c9c8e3
