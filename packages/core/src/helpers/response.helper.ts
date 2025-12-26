import type { RequestOptions } from '../types';
import { HttpError, ParseError } from '../types/error';

export const parseResponse = async (
  response: Response,
  request: RequestOptions
) => {
  if (!response.ok) {
    const errorBody = await safeParseBody(response);
    throw new HttpError(errorBody, response.status, errorBody, response);
  }

  // Custom parser wins
  if (request.parser) {
    return request.parser(response.clone());
  }

  const type = request.responseType ?? 'json';
  if (type === 'raw') return response;

  // 204/205 no content
  if (response.status === 204 || response.status === 205) return undefined;

  if (type === 'text') {
    return response.text();
  }

  // default json with guard for empty body
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch (error) {
    // Surface parse errors as HttpError to avoid treating as success
    throw new ParseError((error as Error).message);
  }
};

const safeParseBody = async (response: Response) => {
  try {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    throw new ParseError('Unable to parse response to text');
  }
};
