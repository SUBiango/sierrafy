/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/*.test.ts'],
  passWithNoTests: true,
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.d.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          isolatedModules: true,
        },
      },
    ],
  },
};
