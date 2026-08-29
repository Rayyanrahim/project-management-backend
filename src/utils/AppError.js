class AppError extends Error {
  constructor(message, statusCode = 500, messageCode = null) {
    super(message);

    this.statusCode = statusCode;
    this.messageCode = messageCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
