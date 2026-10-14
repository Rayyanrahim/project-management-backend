import ImageKit from '@imagekit/nodejs';
import config from '#config/config.js';
import AppError from '#utils/AppError.js';

const assertImageKitConfig = () => {
  if (!config.IMAGEKIT_PRIVATE_KEY || !config.IMAGEKIT_PUBLIC_KEY || !config.IMAGEKIT_URL_ENDPOINT) {
    throw new AppError('ImageKit is not configured', 500, 'IMAGEKIT_NOT_CONFIGURED');
  }
};

const imagekit = new ImageKit({
  privateKey: config.IMAGEKIT_PRIVATE_KEY || 'missing-private-key',
});

export const getImageKitClient = () => {
  assertImageKitConfig();
  return imagekit;
};

export default imagekit;
