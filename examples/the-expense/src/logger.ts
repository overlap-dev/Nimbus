import type { LevelName } from '@std/log';
import * as log from '@std/log';
import process from 'node:process';

export const getLogLevelName = (level: string): LevelName => {
    if (level === 'debug') {
        return 'DEBUG';
    } else if (level === 'info') {
        return 'INFO';
    } else if (level === 'warn') {
        return 'WARN';
    } else if (level === 'error') {
        return 'ERROR';
    } else if (level === 'critical') {
        return 'CRITICAL';
    } else {
        return 'NOTSET';
    }
};

export const getLoggerOptions = () => {
    if (process.env.NODE_ENV === 'development') {
        return {
            formatter: (record: log.LogRecord) => {
                let dataObject;
                let message = '';

                if (record.msg.startsWith('{')) {
                    try {
                        dataObject = JSON.parse(record.msg);

                        if (dataObject.msg?.length > 0) {
                            message = dataObject.msg;
                            delete dataObject.msg;
                        }

                        if (dataObject.message?.length > 0) {
                            message = dataObject.message;
                            delete dataObject.message;
                        }
                    } catch (_error) {
                        message = record.msg;
                    }
                }

                if (!dataObject) {
                    message = record.msg;
                }

                return `[${record.loggerName}] ${record.levelName} ${message}${
                    Object.keys(dataObject ?? {}).length
                        ? `\n${JSON.stringify(dataObject, null, 2)}`
                        : ''
                }`;
            },
            useColors: true,
        };
    } else {
        return {
            formatter: log.formatters.jsonFormatter,
            useColors: false,
        };
    }
};
