import { randomInt } from 'node:crypto';
import config from '#config/config.js';
import { OTP_LENGTH, STATIC_OTP_CODE} from '#constant/constant.js';

const generateOtp = () => {
    if (config.APP_ENV !== 'production') {
        return STATIC_OTP_CODE;
    }

    const min = 10 ** (OTP_LENGTH - 1);
    const max = 10 ** OTP_LENGTH;

    return randomInt(min, max).toString();
};

export default generateOtp;