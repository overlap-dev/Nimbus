import * as E from '@baetheus/fun/either';
import { type Exception, GenericException } from '@nimbus/core';
import { getLogger } from '@std/log';
import process from 'node:process';

type GetEnvInput = {
    variables: string[];
};

/**
 * Get environment variables in a safe way.
 * Optionally logs an error listing the missing environment variables
 * and returns an Exception if one or more are missing.
 *
 * @param variables - The list of environment variables to get
 * @returns Either<Exception, Record<string, string>>
 */
export const getEnv = ({
    variables,
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
        getLogger('Nimbus').error({
            message: 'Undefined environment variables',
            undefinedVariables: missingEnvVars,
        });

        return E.left(new GenericException());
    }

    return E.right(envVars);
};
