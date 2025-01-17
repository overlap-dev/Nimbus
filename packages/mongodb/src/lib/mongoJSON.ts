import { InvalidInputException } from '@nimbus/core';
import { ObjectId } from 'mongodb';

/**
 * Converts a JavaScript object to a JSON string.
 *
 * @param {Record<string, unknown>} object - The object to stringify.
 * @returns {string} The JSON string representation of the object.
 */
const mongoJSONStringify = (object: Record<string, unknown>): string => {
    return JSON.stringify(object);
};

/**
 * Parses a JSON string of MongoDB filter object.
 * Converts certain datatypes to the correct JS representation
 * by looking for specific prefixes in the JSON string.
 *
 * @param {string} text - JSON string to parse
 * @param {string[]} operatorBlackList - List of operators that are not allowed. Defaults to ['$where']
 *
 * @returns {Object} The parsed object
 *
 * @throws {Error} - If the JSON string is invalid or contains a blacklisted operator
 */
const mongoJSONParse = (
    text: string,
    operatorBlackList: string[] = ['$where'],
): any => {
    for (const operator of operatorBlackList) {
        if (text.includes(operator)) {
            throw new Error(`Operator '${operator}' is not allowed`);
        }
    }

    const reviver = (_key: string, value: unknown) => {
        if (typeof value !== 'string') {
            return value;
        }

        if (value.startsWith('objectId::')) {
            return new ObjectId(value.replace('objectId::', ''));
        } else if (value.startsWith('date::')) {
            return new Date(value.replace('date::', ''));
        } else if (value.startsWith('int::')) {
            return parseInt(value.replace('int::', ''));
        } else if (value.startsWith('double::')) {
            return parseFloat(value.replace('double::', ''));
        } else {
            return value;
        }
    };

    try {
        return JSON.parse(text, reviver);
    } catch (error) {
        if (error instanceof Error) {
            throw new InvalidInputException().fromError(error);
        } else {
            throw new InvalidInputException('MongoJSON parse error');
        }
    }
};

/**
 * Parse and stringify JSON with support for MongoDB types.
 *
 * The parse function takes care to convert certain datatype
 * to the correct JS representation by looking for specific
 * prefixes in the JSON string.
 *
 * @example
 * ```ts
 * import { MongoJSON } from '@nimbus/mongodb';
 *
 * const filterString = MongoJSON.stringify({
 *     _id: 'objectId::507f1f77bcf86cd799439011',
 *     name: 'John Doe',
 *     age: 'int::30',
 *     price: 'double::19.99',
 *     createdAt: 'date::2023-01-01T00:00:00Z',
 * });
 *
 * const result = MongoJSON.parse(filterString);
 *
 * // Result will be:
 * // {
 * //     _id: new ObjectId('507f1f77bcf86cd799439011'),
 * //     name: 'John Doe',
 * //     age: 30,
 * //     price: 19.99,
 * //     createdAt: new Date('2023-01-01T00:00:00Z),
 * // }
 * ```
 */
export const MongoJSON = {
    parse: mongoJSONParse,
    stringify: mongoJSONStringify,
};
