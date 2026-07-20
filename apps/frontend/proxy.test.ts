/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import proxy from './proxy';

function request(
  path: string,
  {
    accessToken,
    refreshToken,
    headers,
    method = 'GET',
  }: {
    accessToken?: string;
    refreshToken?: string;
    headers?: Record<string, string>;
    method?: string;
  } = {},
) {
  const req = new NextRequest(new URL(`http://localhost:3000${path}`), { method, headers });
  if (accessToken) req.cookies.set('accessToken', accessToken);
  if (refreshToken) req.cookies.set('refreshToken', refreshToken);
  return req;
}

// JWT falso — só o payload importa (assinatura é verificada no backend)
function fakeJwt(payload: Record<string, unknown>, { expiresInSeconds = 900 } = {}) {
  const body = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds, ...payload }),
  ).toString('base64url');
  return `header.${body}.signature`;
}

const validToken = () => fakeJwt({ userType: 'student' });
const expiredToken = () => fakeJwt({ userType: 'student' }, { expiresInSeconds: -60 });

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('proxy — navegação normal', () => {
  it('should redirect unauthenticated navigation to /login', async () => {
    const res = await proxy(request('/home'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should let a request with a valid token through without refreshing', async () => {
    const res = await proxy(request('/home', { accessToken: validToken() }));
    expect(res.headers.get('location')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should redirect a role to its own home when accessing a foreign area', async () => {
    const res = await proxy(request('/teacher', { accessToken: validToken() }));
    expect(res.headers.get('location')).toBe('http://localhost:3000/student');
  });
});

describe('proxy — Server Actions', () => {
  // Um POST de Server Action não pode receber um redirect HTTP: o cliente do Next
  // tenta parsear a resposta como payload de action e quebra com
  // "An unexpected response was received from the server."
  it('should NOT redirect a Server Action POST when the session expired', async () => {
    const res = await proxy(
      request('/home', { method: 'POST', headers: { 'next-action': 'abc123' } }),
    );
    expect(res.headers.get('location')).toBeNull();
  });

  it('should NOT redirect a Server Action POST hitting a foreign role area', async () => {
    const res = await proxy(
      request('/teacher', {
        method: 'POST',
        accessToken: validToken(),
        headers: { 'next-action': 'abc123' },
      }),
    );
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — renovação do access token', () => {
  it('should refresh an expired access token and set the new cookie', async () => {
    const fresh = validToken();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ data: { accessToken: fresh }, message: 'ok', statusCode: 200 }),
    });

    const res = await proxy(
      request('/home', { accessToken: expiredToken(), refreshToken: 'refresh-abc' }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res.headers.get('location')).toBeNull();
    expect(res.cookies.get('accessToken')?.value).toBe(fresh);
  });

  it('should refresh when the access token cookie is gone but the refresh token remains', async () => {
    const fresh = validToken();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ data: { accessToken: fresh }, message: 'ok', statusCode: 200 }),
    });

    const res = await proxy(request('/home', { refreshToken: 'refresh-abc' }));

    expect(res.headers.get('location')).toBeNull();
    expect(res.cookies.get('accessToken')?.value).toBe(fresh);
  });

  it('should still enforce role rules using the refreshed token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        data: { accessToken: fakeJwt({ userType: 'student' }) },
        message: 'ok',
        statusCode: 200,
      }),
    });

    const res = await proxy(request('/teacher', { refreshToken: 'refresh-abc' }));
    expect(res.headers.get('location')).toBe('http://localhost:3000/student');
  });

  it('should redirect to /login and clear cookies when the refresh is rejected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ data: null, message: 'Refresh token inválido', statusCode: 401 }),
    });

    const res = await proxy(request('/home', { refreshToken: 'expired-refresh' }));

    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    expect(res.cookies.get('accessToken')?.value).toBe('');
    expect(res.cookies.get('refreshToken')?.value).toBe('');
  });

  it('should redirect to /login when the refresh call itself fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('backend down'));

    const res = await proxy(request('/home', { refreshToken: 'refresh-abc' }));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should NOT refresh on a public route', async () => {
    const res = await proxy(request('/login', { refreshToken: 'refresh-abc' }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBeNull();
  });
});
