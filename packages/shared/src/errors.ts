export class UniAIError extends Error {
  constructor(message: string, public readonly status: number = 500) {
    super(message);
    this.name = "UniAIError";
  }
}

export class AuthError extends UniAIError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "AuthError";
  }
}

export class RateLimitError extends UniAIError {
  constructor(message: string = "Too Many Requests") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends UniAIError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}
