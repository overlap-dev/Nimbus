import { z } from 'zod';

/**
 * Validation for absolute URIs
 * based on the RFC 3986 specification.
 */
export const absoluteUri = z.string().refine((value) => {
    if (!value || value.length === 0) {
        return false;
    }

    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}, {
    message:
        'Must be a valid absolute URI according to RFC 3986. See https://datatracker.ietf.org/doc/html/rfc3986#section-4.3',
});
