import { InvalidInputException } from '@nimbus/core';
import { ObjectId } from 'mongodb';

const mongoJSONStringify = (object: Record<string, unknown>): string => {
    return JSON.stringify(object);
};

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

export const MongoJSON = {
    parse: mongoJSONParse,
    stringify: mongoJSONStringify,
};
