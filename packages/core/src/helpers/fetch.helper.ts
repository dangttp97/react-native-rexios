import type { FetchFn } from '../types/fetch';
import type { QueryRequestClientOptions } from '../types/client';

const getAbortController = () =>
  typeof AbortController !== 'undefined' ? new AbortController() : undefined;

export const withTimeoutAndSignal = (
  fetchFn: FetchFn,
  timeoutMs?: number
): FetchFn => {
  return async (input, init = {}) => {
    const userSignal = init.signal as AbortSignal | undefined;
    const controller =
      timeoutMs || userSignal ? getAbortController() : undefined;
    const abortFromUser = () => controller?.abort();
    if (userSignal) {
      if (userSignal.aborted) {
        abortFromUser();
      } else {
        userSignal.addEventListener('abort', abortFromUser, { once: true });
      }
    }
    const timer =
      timeoutMs && controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : undefined;

    try {
      return await fetchFn(input, {
        ...init,
        signal: controller ? controller.signal : userSignal,
      });
    } finally {
      if (timer) clearTimeout(timer);
      if (userSignal && controller) {
        userSignal.removeEventListener('abort', abortFromUser);
      }
    }
  };
};

export const appendQuery = (
  url: string,
  query?: Record<string, any>
): string => {
  if (!query) return url;
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

export const shouldRetry = (
  retry: QueryRequestClientOptions['request']['retry'],
  error: any,
  attempt: number
) => {
  if (typeof retry === 'function') {
    return retry(error, attempt);
  }
  if (typeof retry === 'number') {
    return attempt < retry;
  }
  return false;
};
