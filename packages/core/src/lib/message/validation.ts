import { Ajv, type AnySchema } from 'ajv';
import { InvalidInputException } from '../exception/invalidInputException.ts';

// Some import shenanigans to make it work in here...
import _addFormats from 'ajv-formats';
const addFormats = _addFormats as unknown as typeof _addFormats.default;

const ajv = new Ajv();
addFormats(ajv);

export type ValidationResult<TData> = {
    data: TData;
    error: undefined;
} | {
    data: undefined;
    error: InvalidInputException;
};

// TODO: find a way to inject a custom AJV instance from outside, or provide a generic interface and functions to register and precompile schemas
//
// Idea:
// Use asyncApi Document for messages, and precompile all schemas for messages
// with a set $id and then reference the precompiled schemas with the
// dataschema property on the messages
//
// https://ajv.js.org/guide/managing-schemas.html#compiling-during-initialization

export const validate = <TData>(
    schema: AnySchema,
    data: unknown,
): ValidationResult<TData> => {
    const validate = ajv.compile(schema);
    const isValid = validate(data);

    if (isValid) {
        return { data: data as TData, error: undefined };
    } else {
        return {
            data: undefined,
            error: new InvalidInputException('The provided input is invalid', {
                issues: validate.errors,
            }),
        };
    }
};
