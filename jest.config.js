module.exports = {
  testRegex: '.+\\.test\\.ts',
  testTimeout: 30000,
  testURL: 'http://localhost/',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.ts'],
  verbose: false,
};
