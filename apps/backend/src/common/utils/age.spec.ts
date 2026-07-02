import { isMinor } from './age';

describe('isMinor', () => {
  const reference = new Date(2026, 6, 2); // 02/07/2026

  it('should return true when person is under 18', () => {
    expect(isMinor(new Date(2010, 0, 1), reference)).toBe(true);
  });

  it('should return false when person is 18 or older', () => {
    expect(isMinor(new Date(2000, 0, 1), reference)).toBe(false);
  });

  it('should return false on the exact 18th birthday', () => {
    expect(isMinor(new Date(2008, 6, 2), reference)).toBe(false);
  });

  it('should return true one day before the 18th birthday', () => {
    expect(isMinor(new Date(2008, 6, 3), reference)).toBe(true);
  });
});
