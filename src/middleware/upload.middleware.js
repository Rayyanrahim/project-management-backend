import multer from 'multer';
import AppError from '#utils/AppError.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new AppError('Only jpg, png, webp allowed', 422, 'INVALID_IMAGE_TYPE'));
        }
        return cb(null, true);
    },
});

const wrap = (middleware) => (req, res, next) => {
    middleware(req, res, (err) => {
        if (!err) return next();
        if (err instanceof AppError) return next(err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File too large. Max 5MB allowed', 422, 'FILE_TOO_LARGE'));
        }
        return next(new AppError(err.message || 'Upload failed', 422, 'UPLOAD_FAILED'));
    });
};

export default {
    single: (field) => wrap(upload.single(field)),
    array: (field, maxCount) => wrap(upload.array(field, maxCount)),
};
