const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const { actual, reference, state, executor: op, validators } = await testSetup('/home/andrewosh/Development/mock-trie/fuzzing.js')

  await op.rename("bbc/d/dc/bbb","c/bb/b")
  await op.put("c/bc/dbb/d","pljeqhtgud")
  await op.symlink("/b/bb/ccb","bbc/bdd/d")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key c', async t => {
    const { tests } = await getObjects()

    t.error(await tests.sameIterators("c",{"gt":false,"recursive":false}))
    t.end()
  })
}

const config = {
 "seed": "mock-trie",
 "numIterations": 1,
 "numOperations": 3,
 "shortening": {
  "maxShorteningIterations": 1000000
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
   "keys": 20
  },
  "iterators": {
   "enabled": true,
   "keys": 200,
   "canBeRecursive": false,
   "canBeGT": false
  }
 },
 "debug": true
}

if (require.main) {
  runTests()
} else {
  module.exports = {
    runTests,
    getObjects,
    config
  }
}
