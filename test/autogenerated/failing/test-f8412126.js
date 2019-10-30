const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.put("b","pbutvoilmg")
  await op.symlink("/b/b/b","dbb/cc")
  await op.symlink("b","c")
  await op.symlink("/b","c/b")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key dbb/cc/c/bcc/bb', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("dbb",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key dbb/cc/c/bcc/bb')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie3987",
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
// @FUZZ_SIGNATURE f84121262534213b0c71f38c3d7e9b0f2defa40605a2f14487373b6fd42bdc26
