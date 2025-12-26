import type { Middleware, MiddlewareContext } from '../types/middleware';
import type { RequestOptions } from '../types/request';

type RequestExecutor = (ctx: MiddlewareContext<any>) => Promise<Response>;

export const executeWithMiddlewares = async <T = any>(
  ctx: MiddlewareContext<T>,
  middlewares: Middleware<T>[],
  doRequest: RequestExecutor
): Promise<T | Response> => {
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
          return nextResponse;
        }
      );
      if (maybe !== undefined) {
        return maybe as T;
      }
    }
    return ctx.response as Response;
  } catch (error) {
    for (const middleware of middlewares) {
      await middleware.onError?.(ctx, error);
    }
    throw error;
  }
};
