module.exports = {
  global: {
    seed: 'fuzzing-',
    iterations: 2000,
    operations: 10
  },
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
    absoluteSymlink: {
      enabled: true,
      weight: 1
    },
    relativeSymlink: {
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
      syntheticKeys: 2000
    },
    iteration: {
      enabled: true,
      syntheticKeys: 2000
    }
  }
}
