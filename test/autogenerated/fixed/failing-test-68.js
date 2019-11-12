const p = require('path')
const test = require('tape')
const testSetup = require('fuzz-lightyear/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("c/bc/dbb/d","pljeqhtgud")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key c', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("c",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err)
    }
    t.end()
  })
}

const config = {
 "seed": "mock-trie",
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
// @FUZZ_SIGNATURE f01fe345a5fcfa9f78565230fc09bde6364a7dca2b04ef8963b837869e314df5
