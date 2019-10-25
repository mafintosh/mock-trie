const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  // 0+1
  // 1+0
  // 0+2

  await op.symlink("d","bbb") // 0
  await op.symlink("/bbb/c","d/bbc") // 1
  await op.put("d/c","nbbzttjhhs")

const i = reference.iterator('')

i.next(console.log)
i.next(console.log)
i.next(console.log)
i.next(console.log)
i.next(console.log)

return new Promise(() => {})

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('"iterator should not return unexpected key bbb/bbc"', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIterators("bbb",{"gt":false,"recursive":true})
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, '"iterator should not return unexpected key bbb/bbc"')
    }
    t.end()
  })
}

const config = {
 "seed": "fuzzing-",
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
 },
 "seedNumber": 2
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
// @FUZZ_SIGNATURE 7c2aa1215eaa8786b4f6997333b9e16552ac78f0e06dc4b461d6ca238b7fa521
// @FUZZ_TIMESTAMP Fri Oct 25 2019 16:29:51 GMT+0200 (Central European Summer Time)
