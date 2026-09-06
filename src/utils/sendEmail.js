import nodemailer from 'nodemailer';
import config from '#config/config.js';
import AppError from '#utils/AppError.js';

const sendEmail = async ({ to, subject, text }) => {
    if (!config.SMTP_HOST || !config.SMTP_FROM) {
        throw new AppError('Email delivery is not configured', 500, 'EMAIL_NOT_CONFIGURED');
    }

    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        ...(config.SMTP_USER && {
            auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
        }),
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });

    return transporter.sendMail({ from: config.SMTP_FROM, to, subject, text });
};

export default sendEmail;
