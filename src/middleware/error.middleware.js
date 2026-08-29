import config from '#config/config.js'
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    console.error(err);

    res.status(statusCode).json({
        status: 'error',
        message:
            statusCode === 500
                ? 'Internal server error'
                : err.message,

        ...(err.messageCode && {
            messageCode: err.messageCode,
        }),

        ...(config.APP_ENV === 'development' && {
            stack: err.stack,
        }),
    });
};
