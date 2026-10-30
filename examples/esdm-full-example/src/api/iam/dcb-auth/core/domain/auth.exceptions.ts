import { UnauthorizedException } from '@nimbus-cqrs/core';

export const AUTH_ERROR_CODES = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

export const authUnauthorizedException = (): UnauthorizedException => {
    return new UnauthorizedException('Unauthorized', {
        errorCode: AUTH_ERROR_CODES.UNAUTHORIZED,
    });
};

export const authInvalidCredentialsException = (): UnauthorizedException => {
    return new UnauthorizedException('Invalid email or password', {
        errorCode: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
};
