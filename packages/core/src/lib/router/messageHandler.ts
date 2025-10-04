import { InvalidInputException } from '../exception/invalidInputException.ts';
import { getLogger } from '../log/logger.ts';
import type { Message } from '../message/message.ts';
import { getValidator } from '../validator/validator.ts';

export const createMessageHandler = <TInput extends Message, TOutput = unknown>(
    {
        handlerFunction,
        allowUnsafeInput,
    }: {
        handlerFunction: (message: TInput) => Promise<TOutput>;
        allowUnsafeInput?: boolean;
    },
): (message: TInput) => Promise<TOutput> => {
    const validator = getValidator();

    return async (message: TInput) => {
        let validMessage: TInput;

        if (message.dataschema) {
            const { data, error } = validator.validate<TInput>(
                message.dataschema,
                message,
            );

            if (error) {
                throw error;
            } else {
                validMessage = data;
            }
        } else {
            if (allowUnsafeInput) {
                getLogger().warn({
                    category: 'Nimbus',
                    message: 'No dataschema found for message',
                });
            } else {
                throw new InvalidInputException(
                    'No dataschema provided for message',
                    {
                        errorCode: 'MISSING_DATASCHEMA',
                        reason: `The dataschema is missing on the message
                            and "allowUnsafeInput" is not enabled to the message type.
                            It is recommended to always provide a dataschema
                            for input validation. Otherwise set "allowUnsafeInput"
                            to true for the route handler.`,
                    },
                );
            }
            validMessage = message as TInput;
        }

        return handlerFunction(validMessage);
    };
};
