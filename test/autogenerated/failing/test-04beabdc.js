const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.symlink("../dbb","c")
  await op.symlink("/c","bbd")
  await op.put("c/ccc/b/bc","herbjwdwwb")
  await op.rename("bbd","c/d")

const i = actual.iterator('c')

i.next(console.log)
i.next(console.log)
i.next(console.log)

// console.log(reference.get('c/d/d/d/d/d/d/d/d/d/d/ccc/b/bc'))

return new Promise(() => {})

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key c/d/d/d/d/d/d/d/d/d/d/ccc/b/bc', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("c",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key c/d/d/d/d/d/d/d/d/d/d/ccc/b/bc')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie75",
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
// @FUZZ_SIGNATURE 04beabdc13a371e50068f2fd779abbc82340c9228bd1645320c8c80eda1d456f
