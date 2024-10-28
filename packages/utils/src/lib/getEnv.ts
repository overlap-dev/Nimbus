import { Exception, GenericException } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import type { Logger } from 'pino';

type GetEnvInput = {
    variables: string[];
    logger?: Logger;
};

/**
 * Get environment variables in a safe way.
 * Optionally logs an error listing the missing environment variables
 * and returns an Exception if one or more are missing.
 *
 * @param variables - The list of environment variables to get
 * @returns fp-ts/Either<Exception, Record<string, string>>
 */
export const getEnv = ({
    variables,
    logger,
}: GetEnvInput): E.Either<Exception, Record<string, string>> => {
    const envVars: Record<string, string> = {};
    const missingEnvVars: string[] = [];

    for (const variable of variables) {
        if (!process.env[variable]) {
            missingEnvVars.push(variable);
        }

        envVars[variable] = process.env[variable] as string;
    }

    if (missingEnvVars.length > 0) {
        if (logger) {
            logger.error({
                message: 'Undefined environment variables',
                undefinedVariables: missingEnvVars,
            });
        }

        return E.left(new GenericException());
    }

    return E.right(envVars);
};
