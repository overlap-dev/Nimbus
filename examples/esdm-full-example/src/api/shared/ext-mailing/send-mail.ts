import { getEnv } from '@nimbus-cqrs/core';
import nodemailer, { type Transporter } from 'nodemailer';
import { toError } from '../lib/toError.ts';

export type SendMailInput = {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    text?: string;
};

let transporter: Transporter | null = null;
let fromAddress: string | null = null;

const getTransporter = (): { transporter: Transporter; from: string } => {
    if (transporter && fromAddress) {
        return { transporter, from: fromAddress };
    }

    const env = getEnv({
        variables: [
            'SMTP_HOST',
            'SMTP_PORT',
            'SMTP_USER',
            'SMTP_PASSWORD',
            'SMTP_FROM',
        ],
    });

    const port = Number(env.SMTP_PORT);
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error(
            `SMTP_PORT must be a positive number, got: ${env.SMTP_PORT}`,
        );
    }

    // TODO: remove when getEnv supports optional variables
    const smtpAuth =
        env.SMTP_USER &&
        env.SMTP_USER !== '_NONE_' &&
        env.SMTP_PASSWORD &&
        env.SMTP_PASSWORD !== '_NONE_'
            ? {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASSWORD,
              }
            : undefined;

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: smtpAuth,
    });
    fromAddress = env.SMTP_FROM;

    return { transporter, from: fromAddress };
};

export const sendMail = async (input: SendMailInput): Promise<void> => {
    try {
        const { transporter: mailer, from } = getTransporter();

        await mailer.sendMail({
            from,
            to: input.to,
            ...(input.cc !== undefined ? { cc: input.cc } : {}),
            ...(input.bcc !== undefined ? { bcc: input.bcc } : {}),
            subject: input.subject,
            html: input.html,
            ...(input.text !== undefined ? { text: input.text } : {}),
        });
    } catch (error) {
        throw toError(error);
    }
};
