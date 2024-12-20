const createResponse = (statusCode, message, data = null, error = null) => {
  return {
    status: statusCode,
    message,
    ...(data && { data }), // Include data only if it's provided
    ...(error && { error }), // Include error only if it's provided
  };
};

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json(createResponse(statusCode, message, null, err.details || null));
};

module.exports ={
  createResponse,
  errorHandler
};