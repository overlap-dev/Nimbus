import type { LevelName } from '@std/log';

/**
 * Gets a log level suitable for @std/log based on a string.
 *
 * @param {string} level - The log level as a string.
 *
 * @returns {LevelName} The @std/log LevelName.
 */
export const getLogLevel = (level: string = 'NOTSET'): LevelName => {
    const validLogLevels = [
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'CRITICAL',
        'NOTSET',
    ];

    if (!validLogLevels.includes(level)) {
        console.warn(
            `Invalid log level: ${level}. Defaulting to NOTSET. Valid log levels are: ${
                validLogLevels.join(', ')
            }`,
        );

        return 'NOTSET';
    } else {
        return level as LevelName;
    }
};
