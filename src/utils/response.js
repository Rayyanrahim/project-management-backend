export const formatResponse = (
  res,
  statusCode,
  message,
  data = null,
  messageCode = null
) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    ...(data !== null && { data }),
    ...(messageCode !== null && { messageCode }),
  });
};
