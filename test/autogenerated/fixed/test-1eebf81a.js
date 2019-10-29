const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("bb/d/cc","ntosxniunz")
  await op.symlink("/bc/b","bb/d/b/d")
  await op.symlink("/bb","bc/b")

// bc/b/d/b/d/d/cc
//
// bc/b --> /bb
//           bb/d/b/d --> /bc/b


  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key bc/b/d/b/d/b/c', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("bc",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key bc/b/d/b/d/b/c')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie927",
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
 }
},
}
if (require.main && !process.env['FUZZ_DISABLE_TEST']) {
  runTests()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE 1eebf81aaed7c92aa331a2d52704e66e670e29941cb5cbb91879f3fefabbd949
