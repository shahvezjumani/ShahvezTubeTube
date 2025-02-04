class ApiError extends Error {
  constructor(
    statusCode,
    message = "something went wrong",
    error = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.stack = stack || Error.captureStackTrace(this, this.constructor);
    this.error = error;
    this.data = null;
    this.success = false;
  }
}

export { ApiError };
