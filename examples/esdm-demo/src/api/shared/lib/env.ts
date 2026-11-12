import process from 'node:process';

/**
 * Check if an environment variable is set to `true` or `1`.
 *
 * @param name - The environment name of the env variable to check.
 * @returns `true` if the environment variable is set to `true` or `1`, `false` otherwise.
 */
export const isEnvFlagOn = (name: string): boolean => {
    const value = process.env[name];

    return value === 'true' || value === '1';
};
