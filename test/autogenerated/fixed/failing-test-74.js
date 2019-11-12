const p = require('path')
const test = require('tape')
const testSetup = require('fuzz-lightyear/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.symlink("d/cd/c","c")
  await op.rename("c","d")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test("Cannot destructure property `i` of 'undefined' or 'null'.", async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("d/bbc/d/cd",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
        console.log(err)
      t.fail(err, "Cannot destructure property `i` of 'undefined' or 'null'.")
    }
    t.end()
  })
}

const config = {
 "seed": "mock-trie244",
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
// @FUZZ_SIGNATURE c07b4fd395e58565b4d2825ad3f34135892a8621f70a837e9751c555f45ea7fc
