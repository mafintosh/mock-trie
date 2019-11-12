const p = require('path')
const test = require('tape')
const testSetup = require('fuzz-lightyear/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.symlink("/d/b/dc/cb","bb")
  await op.symlink("b/../cb","b")
  await op.symlink("/d","b/c/cbd/cdb")
  await op.put("bb/dbd/c","duftjichbp")
  await op.symlink("bd/../../d/b","d/bbb/b")
  await op.symlink("/bc","d/d")
  await op.symlink("d/d/..","bc")

  return { actual, reference, state, tests: validators.tests }
}

async function runTest () {
  const { tests } = await getObjects()
  return tests.sameIterators("cb",{"gt":false,"recursive":true})
}

function runTapeTest () {
  test('iterator returned 7 keys but should return 9 keys', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("cb",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator returned 7 keys but should return 9 keys')
    }
    t.end()
  })
}

module.exports = {
  runTest,
  runTapeTest,
  getObjects,
  config: {
 "seed": "mock-trie6696",
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
  runTapeTest()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE ceb9cd99a59587641248d8796be00794de721919c9205f164813060eaf12af1b
