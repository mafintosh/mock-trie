module.exports = {
  seed: 'mock-trie',
  numIterations: 2000,
  numOperations: 10,
  shortening: {
    maxShorteningIterations: 1e6
  },
  inputs: {
    maxComponentLength: 10,
    maxPathDepth: 5
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
      keys: 20
    },
    iterators: {
      enabled: true,
      keys: 20
    }
  }
}
