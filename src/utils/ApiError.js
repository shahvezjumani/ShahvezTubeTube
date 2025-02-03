class ApiError extends Error {
  constructor(
    error = [],
    stack = "",
    statusCode,
    message = "something went wrong"
  ) {
    super(message);
    this.statusCode = statusCode;
    this.stack = stack || Error.captureStackTrace(this, this.constructor);
    this.error = error;
    this.data = null;
    this.success = false;
  }
}
