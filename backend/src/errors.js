function apiError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function errorHandler(err, req, res, next) {
  console.error(JSON.stringify({
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message,
    orderNo: req.params?.orderNo || null,
    method: req.method,
    path: req.originalUrl
  }));

  res.status(err.status || 500).json({
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.status ? err.message : 'Internal server error'
  });
}

module.exports = { apiError, errorHandler };
