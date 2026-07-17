import { of, lastValueFrom } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let reflector: Reflector;

  const createContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  const createHandler = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);
  });

  it('should wrap response in { data, message, statusCode } by default', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = await lastValueFrom(
      interceptor.intercept(createContext(200), createHandler({ id: '1' })),
    );

    expect(result).toEqual({
      data: { id: '1' },
      message: 'success',
      statusCode: 200,
    });
  });

  it('should pass response through untouched when @SkipResponseWrapper is present (SSE)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = await lastValueFrom(
      interceptor.intercept(createContext(200), createHandler('raw-value')),
    );

    expect(result).toBe('raw-value');
  });
});
