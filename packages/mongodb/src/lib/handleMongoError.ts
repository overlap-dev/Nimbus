import {
    type Exception,
    GenericException,
    InvalidInputException,
} from '@nimbus/core';

/**
 * Handles MongoDB errors and converts them
 * to Nimbus exceptions based on the error code.
 *
 * @param {any} error - The error to handle.
 * @returns {Exception} The Nimbus exception.
 */
export const handleMongoError = (error: any): Exception => {
    if (error.code && error.code === 121) {
        return new InvalidInputException(error.message, {
            code: error.code,
            ...(error.errInfo?.['details'] && {
                details: error.errInfo?.['details'],
            }),
            ...(error.writeErrors && { writeErrors: error.writeErrors }),
            ...(error.result && { result: error.result }),
        }).fromError(error);
    }

    if (error.code && error.code === 2) {
        return new InvalidInputException().fromError(error);
    }

    if (error.code && error.code === 11000) {
        return new InvalidInputException(error.message, {
            keyValue: error['keyValue'],
        }).fromError(error);
    }

    return new GenericException().fromError(error);
};
