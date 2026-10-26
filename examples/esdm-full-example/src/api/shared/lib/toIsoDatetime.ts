/**
 * MongoDB stores datetimes as `Date`. Read models expect ISO strings.
 * Values that are already strings pass through unchanged.
 */
export const toIsoDatetime = (value: unknown): string => {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return String(value);
};
