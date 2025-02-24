import { GenericException, getLogger } from '@nimbus/core';
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
 * @returns {Record<string, string>} Object of the environment variables
 * @throws {GenericException} Thrown if any of the requested variables are not defined
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
        getLogger().error({
            category: 'Nimbus',
            message: 'Undefined environment variables',
            data: {
                undefinedVariables: missingEnvVars,
            },
        });

        throw new GenericException('Undefined environment variables', {
            undefinedVariables: missingEnvVars,
        });
    }

    return envVars;
};
