export const errorHandler = (err, req, res, next) => {
  console.error('Error handler - Error:', err);
  console.error('Error handler - Error name:', err.name);
  console.error('Error handler - Error message:', err.message);
  if (err.stack) {
    console.error('Error handler - Error stack:', err.stack);
  }

  // Asegurar que la respuesta no se haya enviado ya
  if (res.headersSent) {
    console.error('Response already sent, cannot send error response');
    return next(err);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  const statusCode = err.status || 500;
  const errorResponse = {
    error: err.message || 'Internal server error'
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  return res.status(statusCode).json(errorResponse);
};







