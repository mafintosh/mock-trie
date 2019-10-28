const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("db/c/bbb","znovebwyyb")
  await op.symlink("/db","c/db")
  await op.symlink("db/c/d/b","b")
  await op.rename("c","b/b/bb")
  await op.rename("b","c")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key c/b/bb/db/b/bd/d', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("c",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key c/b/bb/db/b/bd/d')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie15",
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
// @FUZZ_SIGNATURE 6e5acd8c46a1821becbbc36941560cc58319a61d84a304150a33046d190b215c
