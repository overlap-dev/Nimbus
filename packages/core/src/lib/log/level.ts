import type { LevelName } from '@std/log';

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
