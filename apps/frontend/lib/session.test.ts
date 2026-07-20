/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));

const cookieStore = { set: jest.fn(), get: jest.fn(), delete: jest.fn() };
jest.mock('next/headers', () => ({ cookies: async () => cookieStore }));

import { createSession, saveUserName } from './session';

// JWT falso — só o payload importa
function jwtFor(userType: string) {
  const body = Buffer.from(JSON.stringify({ userType, exp: 9999999999 })).toString('base64url');
  return `header.${body}.signature`;
}

function cookieOptions(name: string) {
  const call = cookieStore.set.mock.calls.find((c) => c[0] === name);
  return call?.[2] ?? {};
}

beforeEach(() => jest.clearAllMocks());

const SEVEN_DAYS = 60 * 60 * 24 * 7;

describe('createSession', () => {
  it('should keep the access token as a session cookie', async () => {
    await createSession(jwtFor('student'), 'refresh', true);
    expect(cookieOptions('accessToken').maxAge).toBeUndefined();
  });

  it('should persist the refresh token for 7 days when rememberMe is on', async () => {
    await createSession(jwtFor('student'), 'refresh', true);
    expect(cookieOptions('refreshToken').maxAge).toBe(SEVEN_DAYS);
  });

  it('should keep the refresh token session-scoped when rememberMe is off', async () => {
    await createSession(jwtFor('student'), 'refresh', false);
    expect(cookieOptions('refreshToken').maxAge).toBeUndefined();
  });

  // Contas administrativas: a sessão nunca sobrevive ao fechar o browser,
  // independente do que o usuário marcou no login
  it('should ignore rememberMe for super_admin and keep the session cookie-scoped', async () => {
    await createSession(jwtFor('super_admin'), 'refresh', true);
    expect(cookieOptions('refreshToken').maxAge).toBeUndefined();
  });

  it('should ignore rememberMe for institution and keep the session cookie-scoped', async () => {
    await createSession(jwtFor('institution'), 'refresh', true);
    expect(cookieOptions('refreshToken').maxAge).toBeUndefined();
  });

  it('should still persist the session for teachers', async () => {
    await createSession(jwtFor('teacher'), 'refresh', true);
    expect(cookieOptions('refreshToken').maxAge).toBe(SEVEN_DAYS);
  });

  it('should fall back to a session cookie when the token cannot be parsed', async () => {
    await createSession('not-a-jwt', 'refresh', true);
    expect(cookieOptions('refreshToken').maxAge).toBeUndefined();
  });
});

describe('saveUserName', () => {
  it('should not outlive the session when rememberMe is off', async () => {
    await saveUserName('Ana', false);
    expect(cookieOptions('userName').maxAge).toBeUndefined();
  });

  it('should persist alongside the refresh token when rememberMe is on', async () => {
    await saveUserName('Ana', true);
    expect(cookieOptions('userName').maxAge).toBe(SEVEN_DAYS);
  });
});
