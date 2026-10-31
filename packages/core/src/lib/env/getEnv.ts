import process from 'node:process';
import { GenericException } from '../exception/genericException.ts';
import { getLogger } from '../log/logger.ts';

/**
 * Environment variables read by {@link getEnv}.
 *
 * Names passed in `variables` are `string`.
 * Names passed only in `optionalVariables` are `string | undefined`.
 * A name listed in both arrays is required.
 */
export type GetEnvResult<
    Required extends readonly string[],
    Optional extends readonly string[],
> = {
    [Key in Required[number]]: string;
} & {
    [Key in Exclude<Optional[number], Required[number]>]: string | undefined;
};

/**
 * Read environment variables from `process.env`.
 *
 * Required names must be set to a non-empty string. A missing or empty
 * required name is logged and thrown as a {@link GenericException}.
 * Optional names are returned as `undefined` when they are missing or empty.
 *
 * Pass the names as array literals. TypeScript then types required values as
 * `string` and optional values as `string | undefined`. A `string[]` variable
 * widens both lists, so that split is lost.
 *
 * @param input - The environment variable names to read.
 * @param input.variables - Required environment variable names.
 * @param input.optionalVariables - Optional environment variable names.
 * @returns The requested environment variables.
 * @throws {GenericException} Thrown when any required variable is missing or empty.
 *
 * @example
 * ```ts
 * const env = getEnv({
 *     variables: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'],
 *     optionalVariables: ['SMTP_USER', 'SMTP_PASSWORD'],
 * });
 *
 * env.SMTP_HOST; // string
 * env.SMTP_USER; // string | undefined
 * ```
 */
export const getEnv = <
    const Required extends readonly string[] = [],
    const Optional extends readonly string[] = [],
>({
    variables,
    optionalVariables,
}: {
    variables?: Required;
    optionalVariables?: Optional;
}): GetEnvResult<Required, Optional> => {
    const requiredNames = variables ?? [];
    const optionalNames = optionalVariables ?? [];
    const envVars: Record<string, string | undefined> = {};
    const missingEnvVars: string[] = [];

    for (const variable of requiredNames) {
        const value = process.env[variable];

        if (!value) {
            missingEnvVars.push(variable);
            continue;
        }

        envVars[variable] = value;
    }

    for (const variable of optionalNames) {
        if (Object.hasOwn(envVars, variable)) {
            continue;
        }

        const value = process.env[variable];
        envVars[variable] = value ? value : undefined;
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

    return envVars as GetEnvResult<Required, Optional>;
};
