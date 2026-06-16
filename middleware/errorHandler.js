// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", err);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    error = new AppError(`Resource not found with id: ${err.value}`, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new AppError(`${field} '${value}' already exists`, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token. Please log in again.", 401);
  }
  if (err.name === "TokenExpiredError") {
    error = new AppError("Your token has expired. Please log in again.", 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
