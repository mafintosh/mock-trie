const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const { actual, reference, state, executor: op, validators } = await testSetup('/home/andrewosh/Development/mock-trie/fuzzing.js')

  await op.put("d/bdc/bb","scsjhvvoer")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator returned 1 keys but should return 2 keys', async t => {
    const { tests } = await getObjects()

    t.error(await tests.sameIterators("d",{"gt":false,"recursive":true}))
    t.end()
  })
}

const config = {
 "seed": "mock-trie",
 "numIterations": 1000,
 "numOperations": 50,
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
const signature = 'c87fb1e2580c2d9b3532124ab4e6fe6f05639ad30d4dfe1ad9bd483ca4a449ed'

if (require.main) {
  runTests()
} else {
  module.exports = {
    runTests,
    getObjects,
    config,
  }
}

// @FUZZ_SIGNATURE c87fb1e2580c2d9b3532124ab4e6fe6f05639ad30d4dfe1ad9bd483ca4a449ed
