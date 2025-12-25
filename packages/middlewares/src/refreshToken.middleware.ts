import type { Middleware } from '@rexios/core';
import type { RequestOptions } from '@rexios/core';

type RefreshResult = { token: string } | { token?: string };

export type Auth401MiddlewareOptions = {
  /** Lấy access token hiện tại để gắn vào header */
  getToken: () => Promise<string | undefined> | string | undefined;
  /** Refresh access token khi gặp 401. Trả về token mới (hoặc throw nếu fail). */
  refreshToken: () => Promise<RefreshResult>;
  /** Callback khi token mới được cập nhật (ví dụ lưu storage) */
  onToken?: (token: string) => Promise<void> | void;
  /** Callback khi refresh thất bại */
  onRefreshFailed?: (error: any) => Promise<void> | void;
  /** Cho phép tùy biến nhận biết 401 (mặc định response.status === 401) */
  isUnauthorized?: (response: Response) => boolean;
  /** Tùy chọn build header Authorization */
  buildAuthHeader?: (token: string) => string;
};

/**
 * Middleware handle 401: gắn Authorization trước khi fetch, khi gặp 401 thì refresh token một lần cho tất cả
 * request pending và retry lại request gốc sau khi refresh thành công.
 */
export const createAuth401Middleware = (
  options: Auth401MiddlewareOptions
): Middleware<any> => {
  const is401 =
    options.isUnauthorized ?? ((response: Response) => response.status === 401);
  const buildHeader =
    options.buildAuthHeader ?? ((token: string) => `Bearer ${token}`);

  let refreshPromise: Promise<string | undefined> | null = null;

  const ensureRefresh = async () => {
    if (!refreshPromise) {
      refreshPromise = options
        .refreshToken()
        .then(async (res) => {
          const token = res.token;
          if (token) {
            await options.onToken?.(token);
          }
          return token;
        })
        .catch(async (err) => {
          await options.onRefreshFailed?.(err);
          throw err;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  };

  return {
    before: async (ctx) => {
      // Nếu đang refresh, đợi xong rồi mới gắn token để request không bắn với token cũ
      if (refreshPromise) {
        try {
          await refreshPromise;
        } catch {
          // refresh fail -> vẫn tiếp tục, request sẽ fail và bubble error
        }
      }
      const token = await options.getToken();
      if (!token) return;
      ctx.headers = {
        ...ctx.headers,
        Authorization: buildHeader(token),
      };
    },
    after: async (ctx, next) => {
      if (!ctx.response) return;
      if (!is401(ctx.response)) return;

      // Tránh loop vô hạn: nếu đã retry một lần, bubble lỗi
      if ((ctx as any)._authRetried) {
        return;
      }

      const token = await ensureRefresh();
      if (!token) {
        return;
      }

      (ctx as any)._authRetried = true;
      const retryRequest: RequestOptions = {
        url: ctx.url,
        method: ctx.method,
        headers: {
          ...ctx.headers,
          Authorization: buildHeader(token),
        },
        body: ctx.body,
      };

      return await next?.(retryRequest);
    },
    onError: async (_ctx, error) => {
      // Nếu refresh thất bại, propagate lỗi ra ngoài để caller xử lý
      await options.onRefreshFailed?.(error);
    },
  };
};
