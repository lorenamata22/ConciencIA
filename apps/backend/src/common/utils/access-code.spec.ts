import { generateAccessCode } from './access-code';

describe('generateAccessCode', () => {
  it('should generate an 8-character code', () => {
    expect(generateAccessCode()).toHaveLength(8);
  });

  it('should only use unambiguous alphabet characters (no I, O, 0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateAccessCode()).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/,
      );
    }
  });
});
