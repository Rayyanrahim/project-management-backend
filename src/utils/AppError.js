class AppError extends Error {
  constructor(message, statusCode = 500, messageCode = null, data = null) {
    super(message);

    this.statusCode = statusCode;
    this.messageCode = messageCode;
    this.data = data;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
