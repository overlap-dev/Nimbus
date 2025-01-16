import * as log from '@std/log';

export const jsonLogHandlerOptions = {
    formatter: log.formatters.jsonFormatter,
    useColors: false,
};

export const prettyLogHandlerOptions = {
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
