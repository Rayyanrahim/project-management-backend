import { toFile } from '@imagekit/nodejs';
import config from '#config/config.js';
import { getImageKitClient } from '#config/imagekit.js';
import AppError from '#utils/AppError.js';

class ImageKitService {
    async uploadFile(file, folder = '/uploads') {
        if (!file?.buffer || !file?.originalname) {
            throw new AppError('File is required', 422, 'FILE_REQUIRED');
        }

        const imagekit = getImageKitClient();

        try {
            const result = await imagekit.files.upload({
                file: await toFile(file.buffer, file.originalname),
                fileName: file.originalname,
                folder,
                useUniqueFileName: true,
            });

            return {
                fileId: result.fileId,
                url: result.url,
                name: result.name,
                filePath: result.filePath,
            };
        } catch (error) {
            if (error instanceof AppError) throw error;

            throw new AppError(
                error?.message || 'Unable to upload file to ImageKit',
                500,
                'IMAGEKIT_UPLOAD_FAILED',
            );
        }
    }

    async deleteFile(fileId) {
        if (!fileId) {
            throw new AppError('File id is required', 422, 'FILE_ID_REQUIRED');
        }

        const imagekit = getImageKitClient();

        try {
            await imagekit.files.delete(fileId);
            return { deleted: true };
        } catch (error) {
            throw new AppError(
                error?.message || 'Unable to delete file from ImageKit',
                500,
                'IMAGEKIT_DELETE_FAILED',
            );
        }
    }

    getUrl(path, { width, height, quality = 80 } = {}) {
        if (!path) {
            throw new AppError('Image path is required', 422, 'IMAGE_PATH_REQUIRED');
        }

        const imagekit = getImageKitClient();
        const transformation = { quality: String(quality) };
        if (width) transformation.width = String(width);
        if (height) transformation.height = String(height);

        return imagekit.helper.buildSrc({
            urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
            src: path,
            transformation: [transformation],
        });
    }

    getAuthParams() {
        const imagekit = getImageKitClient();
        const auth = imagekit.helper.getAuthenticationParameters();

        return {
            publicKey: config.IMAGEKIT_PUBLIC_KEY,
            urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
            ...auth,
        };
    }
}

export default new ImageKitService();
