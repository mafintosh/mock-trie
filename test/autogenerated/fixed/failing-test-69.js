const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("b","nudquievnn")
  await op.put("b/cb/dbc/b/cbc","qhhxpzovuv")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator returned 1 keys but should return 2 keys', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("b",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      t.fail(err)
    }
    t.end()
  })
}

const config = {
 "seed": "mock-trie4",
 "numIterations": 2000,
 "numOperations": 10,
 "shortening": {
  "iterations": 1000000
 },
 "inputs": {
  "maxComponentLength": 3,
  "maxPathDepth": 5
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
}

if (require.main) {
  runTests()
} else {
  module.exports = {
    runTests,
    getObjects,
    config,
  }
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE cd3364330ae97289d13e2a5edbb0fc725f7f1e09e39ead0cf0c06f1a1149c2e4
