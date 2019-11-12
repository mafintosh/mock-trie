const p = require('path')
const test = require('tape')
const testSetup = require('fuzz-lightyear/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("d","gbupljeqht")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key b/cd/cbb/cbb/dc/c/cc/d', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("b/cd/cbb/cbb",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key b/cd/cbb/cbb/dc/c/cc/d')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie",
 "numIterations": 2000,
 "numOperations": 10,
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
// @FUZZ_SIGNATURE e7ca45afe37f8d4b05349fc146f8a161a94f180e5d32ea3cc2fdad279a1f9f51
