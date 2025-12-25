import type { Middleware, MiddlewareContext } from '../types/middleware';
import type { RequestOptions } from '../types/request';

type RequestExecutor = (ctx: MiddlewareContext<any>) => Promise<Response>;

export const executeWithMiddlewares = async <T = any>(
  ctx: MiddlewareContext<T>,
  middlewares: Middleware<T>[],
  doRequest: RequestExecutor
): Promise<T> => {
  try {
    for (const middleware of middlewares) {
      await middleware.before?.(ctx);
    }

    const response = await doRequest(ctx);
    ctx.response = response;

    for (const middleware of middlewares) {
      const maybe = await middleware.after?.(
        ctx,
        async (req: RequestOptions) => {
          const nextResponse = await doRequest({ ...ctx, ...req });
          ctx.response = nextResponse;
          const parsedNext = (await nextResponse.json()) as T;
          ctx.parsed = parsedNext;
          return parsedNext;
        }
      );
      if (maybe !== undefined) {
        return maybe as T;
      }
    }

    const parsed = (await ctx.response?.json()) as T;
    ctx.parsed = parsed;
    return parsed;
  } catch (error) {
    for (const middleware of middlewares) {
      await middleware.onError?.(ctx, error);
    }
    throw error;
  }
};
