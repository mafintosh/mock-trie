const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.symlink("cb/cdd/..","c")
  await op.symlink("/cb","b/d/c/bdd")
  await op.rename("b","cbc/bcb/b/b")
  await op.symlink("/d","c/bbb/bc/cbb")
  await op.rename("cbc","d/b/bcb/bd")
  await op.put("cb/bbd/cb","zghxbogzln")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator returned 18 keys but should return 22 keys', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("d",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator returned 18 keys but should return 22 keys')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie488",
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
// @FUZZ_SIGNATURE baa6cef3bdc8eb8794209180883ac954822941e34b85c8594d860b4e78f5f3ab
