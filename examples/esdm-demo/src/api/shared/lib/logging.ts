/**
 * Map a CloudEvent `correlationid` onto the Nimbus logger `correlationId`
 * field. Omits the field when the id is missing.
 */
export const logCorrelationId = (message: {
    correlationid?: string;
}): { correlationId: string } | Record<string, never> => {
    return message.correlationid
        ? { correlationId: message.correlationid }
        : {};
};
