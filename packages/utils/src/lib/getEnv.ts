import { GenericException } from '@nimbus/core';
import { getLogger } from '@std/log';
import process from 'node:process';

type GetEnvInput = {
    variables: string[];
};

/**
 * Get environment variables from the process.env object.
 * Throws an exception if any of the variables are not defined
 * and logs the missing variable names.
 *
 * @param variables - The list of environment variables to get
 * @returns Record<string, string>
 */
export const getEnv = ({
    variables,
}: GetEnvInput): Record<string, string> => {
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

        throw new GenericException('Undefined environment variables', {
            undefinedVariables: missingEnvVars,
        });
    }

    return envVars;
};
