import { z } from 'zod';

/**
 * MIME Media Type validation schema
 * Validates media types according to RFC 2046 specification
 * which defines the structure of MIME media types.
 *
 * Format: type/subtype[; parameter=value]
 * Examples:
 * - application/json
 * - text/plain
 * - text/plain; charset=utf-8
 * - application/cloudevents+json
 * - multipart/form-data; boundary=something
 */
export const mediaType = z.string().refine((value) => {
    if (!value || value.length === 0) {
        return false;
    }

    // RFC 2046 media type regex pattern
    // Matches: type/subtype with optional parameters
    // type = discrete-type / composite-type / extension-token
    // subtype = extension-token
    // parameter = attribute "=" value
    const mediaTypeRegex =
        /^([a-zA-Z][a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*|[xX]-[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*)\/([a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*|[xX]-[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*)(\s*;\s*[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\s*=\s*([a-zA-Z0-9!#$&\-^_]+|"[^"]*"))*$/;

    if (!mediaTypeRegex.test(value)) {
        return false;
    }

    // Split type and subtype
    const parts = value.split('/');
    if (parts.length < 2) {
        return false;
    }

    const [type, subtypeAndParams] = parts;
    const subtype = subtypeAndParams.split(';')[0].trim();

    // Validate known discrete types
    const discreteTypes = ['text', 'image', 'audio', 'video', 'application'];
    const compositeTypes = ['message', 'multipart'];
    const knownTypes = [...discreteTypes, ...compositeTypes];

    // Allow extension types (starting with x- or X-) or known types
    const isValidType = knownTypes.includes(type.toLowerCase()) ||
        /^[xX]-/.test(type);

    return isValidType && subtype.length > 0;
}, {
    message:
        'Must be a valid MIME media type (e.g., "application/json", "text/plain; charset=utf-8"). See https://datatracker.ietf.org/doc/html/rfc2046',
});
