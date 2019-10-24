module.exports = {
  seed: 'mock-trie',
  numIterations: 2000,
  numOperations: 30,
  shortening: {
    iterations: 1e6
  },
  inputs: {
    maxComponentLength: 3,
    maxPathDepth: 4
  },
  operations: {
    put: {
      enabled: true,
      weight: 2
    },
    symlink: {
      enabled: true,
      weight: 1
    },
    rename: {
      enabled: true,
      weight: 1
    },
    delete: {
      enabled: true,
      weight: 1
    }
  },
  validation: {
    reachable: {
      enabled: true,
    },
    syntheticKeys: {
      enabled: true,
      keys: 2000
    },
    iterators: {
      enabled: true,
      keys: 200,
      recursive: true,
      gt: false,
    }
  }
}
