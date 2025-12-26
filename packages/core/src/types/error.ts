export class RexiosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RexiosError';
  }
}

export class HttpError extends RexiosError {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
    public response: Response
  ) {
    super(message);
  }
}

export class TimeoutError extends RexiosError {
  name: string = 'TimeoutError';
}

export class CancelledError extends RexiosError {
  name: string = 'CancelledError';
}

export class ParseError extends RexiosError {
  name: string = 'ParseError';
}

export class RetryError extends RexiosError {
  name: string = 'RetryError';
}

export class NetworkError extends RexiosError {
  name: string = 'NetworkError';
}

export class UnknownError extends RexiosError {
  name: string = 'UnknownError';
}
