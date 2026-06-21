import { PACKAGE_NAME } from '../index';

describe('@sierrafy/sdk scaffold', () => {
  it('exposes the package name (proves the Jest + ts-jest pipeline runs)', () => {
    expect(PACKAGE_NAME).toBe('@sierrafy/sdk');
  });
});
