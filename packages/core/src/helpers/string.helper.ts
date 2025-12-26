export const joinUrl = (baseURL: string | undefined, url: string): string => {
  if (!baseURL) return url;
  const hasProtocol = /^https?:\/\//i.test(url);
  if (hasProtocol) return url;
  const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
  return `${normalizedBase}/${normalizedPath}`;
};
