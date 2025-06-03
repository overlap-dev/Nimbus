import { z } from 'zod';

/**
 * URI-reference validation schema
 * Validates both absolute URIs and relative references
 * based on the RFC 3986 specification.
 */
export const uriReference = z.string().refine((value) => {
    if (!value || value.length === 0) {
        return false;
    }

    try {
        new URL(value);
        return true;
    } catch {
        const relativeUriReferenceRegex =
            /^([a-zA-Z][a-zA-Z0-9+.-]*:)?\/\/[^\s]*$|^[^\s]*$/;
        return relativeUriReferenceRegex.test(value) && value.length > 0;
    }
}, {
    message:
        'Must be a valid URI-reference according to RFC 3986. See https://datatracker.ietf.org/doc/html/rfc3986#section-4.1',
});
