const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err);

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    if (keys.includes('salesRepId') && keys.includes('startTime')) {
      return res.status(409).json({
        success: false,
        error: 'Slot conflict: This appointment slot has already been reserved for the selected sales representative.'
      });
    }
    if (keys.includes('idempotencyKey')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate request: A booking with this idempotency key already exists.'
      });
    }
    return res.status(409).json({
      success: false,
      error: `Duplicate entry error on field: ${keys.join(', ')}`
    });
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      error: `Resource not found: invalid ID format '${err.value}'`
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
