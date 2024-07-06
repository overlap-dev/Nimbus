import {
    Exception,
    GenericException,
    InvalidInputException,
} from '@ovl-nimbus/core';

export const handleMongoError = (error: any): Exception => {
    if (error.code && error.code === 121) {
        return new InvalidInputException(
            error.message,
            error.errInfo?.['details'],
        );
    } else if (error.code && error.code === 2) {
        return new InvalidInputException(error.message);
    } else if (error.code && error.code === 11000) {
        return new InvalidInputException(error.message, {
            keyValue: error['keyValue'],
        });
    } else {
        return new GenericException(error.message);
    }
};
