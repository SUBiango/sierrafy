/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/*.test.ts'],
  passWithNoTests: true,
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.d.ts'],
  // Acceptance criteria are enforced here, not just asserted in prose:
  // M1 spec §7.7 requires ≥90% coverage on the validator module.
  coverageThreshold: {
    'packages/core/src/validate-nin.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    'packages/core/src/nin-format-schema.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    'packages/core/src/luhn.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // tsconfig.jest.json extends tsconfig.base.json, so tests are held to the
        // same strictness as the code they cover. Note the absence of
        // `isolatedModules`: ts-jest type-checks the tests, which is the only
        // type-checking CI does over test files.
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
};
