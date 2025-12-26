import type { Body, HttpMethod, Headers, RequestOptions } from './request';

export type MiddlewareContext<T> = {
  url: string;
  method: HttpMethod;
  headers?: Headers;
  body?: Body;
  response?: Response;
  parsed?: T;
  retryCount: number;
};

export type MiddlewarePhase = 'before' | 'after' | 'onError';
export type Middleware<T> = {
  before?: (ctx: MiddlewareContext<T>) => Promise<void>;
  after?: (
    ctx: MiddlewareContext<T>,
    next?: (req: RequestOptions) => Promise<T | Response>
  ) => Promise<T | void>;
  onError?: (ctx: MiddlewareContext<T>, error: any) => Promise<void>;
};
