const p = require('path')
const test = require('tape')
const testSetup = require('fuzz-lightyear/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.symlink("bd/b","d/c")
  await op.put("d/bd/b/d/b/cbc/d/bbb","imlbmdkwhc")
  await op.rename("d","d/bd/b/d/b/dcb/bdd/bcc")

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('iterator should not return unexpected key d/bd/b/d/b/dcb/bdd/bcc/c', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("d",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'iterator should not return unexpected key d/bd/b/d/b/dcb/bdd/bcc/c')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "mock-trie447",
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
// @FUZZ_SIGNATURE 0412cabbfa962f65ada8787271cc9987e79033d8edfbeed9793888644726dc6b
