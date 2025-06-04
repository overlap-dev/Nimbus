import { z } from 'zod';

/**
 * RFC 3339 date-time validation schema
 * Validates timestamps according to RFC 3339 specification
 * which is a profile of ISO 8601 for Internet protocols.
 *
 * Format: YYYY-MM-DDTHH:MM:SSZ or YYYY-MM-DDTHH:MM:SS±HH:MM
 * Examples:
 * - 2018-04-05T17:31:00Z
 * - 2018-04-05T17:31:00.123Z
 * - 2018-04-05T17:31:00+01:00
 * - 2018-04-05T17:31:00.123-05:00
 */
export const timeRFC3339 = z.string().refine((value) => {
    if (!value || value.length === 0) {
        return false;
    }

    // RFC 3339 regex pattern
    // Matches: YYYY-MM-DDTHH:MM:SS[.fff]Z or YYYY-MM-DDTHH:MM:SS[.fff]±HH:MM
    const rfc3339Regex =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

    if (!rfc3339Regex.test(value)) {
        return false;
    }

    // Additional validation using Date constructor to catch invalid dates
    // Check if the date is valid (this catches cases like February 30th)
    try {
        const date = new Date(value);
        return !isNaN(date.getTime());
    } catch {
        return false;
    }
}, {
    message:
        'Must be a valid RFC 3339 timestamp (e.g., "2018-04-05T17:31:00Z" or "2018-04-05T17:31:00+01:00"). See https://datatracker.ietf.org/doc/html/rfc3339',
});
