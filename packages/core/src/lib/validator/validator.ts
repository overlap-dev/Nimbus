import type { SchemaObject, ValidateFunction } from 'ajv';
import { Ajv } from 'ajv';
import { GenericException } from '../exception/genericException.ts';
import { InvalidInputException } from '../exception/invalidInputException.ts';
import { commandSchema } from '../message/command.ts';
import { eventSchema } from '../message/event.ts';
import { querySchema } from '../message/query.ts';

// Some import shenanigans to make it work in here...
import _addFormats from 'ajv-formats';
const addFormats = _addFormats as unknown as typeof _addFormats.default;

// TODO: check out https://github.com/standard-schema/standard-schema?tab=readme-ov-file to have it more agnostic like the elysia lib https://elysiajs.com/essential/validation.html

export type ValidatorOptions = {
    ajv?: Ajv;
};

export type ValidationResult<TData> = {
    data: TData;
    error: undefined;
} | {
    data: undefined;
    error: InvalidInputException | GenericException;
};

/**
 * The Validator is used to validate data against a schema.
 * This way e.g. the Nimbus router validates the the route inputs.
 *
 * Use the `setupValidator` function to configure the Validator.
 * It is possible to pass a custom Ajv instance to the Validator if needed.
 *
 * Use the `getValidator` function to get the instance of the Validator.
 *
 * Use the validators `addSchema` method to add schemas to the Validator.
 *
 * Use the validators `validate` method to validate data against a schema.
 * Pass in a schemaId to use a precompiled schema added to the validator before
 * or pass in a schema object to compile the schema on the fly.
 *
 * @example
 * ```ts
 * import { setupValidator, getValidator } from "@nimbus/core";
 *
 * setupValidator({
 *     ajv: myCustomAjvInstance,
 * });
 *
 * const validator = getValidator();
 *
 * validator.addSchema(mySchema);
 *
 * const result1 = validator.validate('theSchemaId', myData);
 * const result2 = validator.validate(mySchema, myData);
 * ```
 */
export class Validator {
    private static _instance: Validator;

    private readonly _ajv: Ajv;

    constructor(options?: ValidatorOptions) {
        if (options?.ajv) {
            this._ajv = options.ajv;
        } else {
            this._ajv = new Ajv();
            addFormats(this._ajv);
        }
    }

    /**
     * Configure the Validator.
     */
    public static configure(options?: ValidatorOptions): void {
        const validator = new Validator(options);

        validator.addSchema(querySchema);
        validator.addSchema(eventSchema);
        validator.addSchema(commandSchema);

        Validator._instance = validator;
    }

    /**
     * Get the Validator instance.
     *
     * @returns {Validator} The Validator instance
     */
    public static getInstance(): Validator {
        if (!Validator._instance) {
            this.configure();
        }

        return Validator._instance;
    }

    /**
     * Validate data against a schema.
     *
     * @param {string | SchemaObject} schema - Either a schema id to use a precompiled schema or a schema object.
     * @param {unknown} data - The data to validate.
     *
     * @returns {ValidationResult<TData>} The validation result with either the data, an GenericException if the schema is not found, or an InvalidInputException if the data is invalid.
     *
     * @template TData - The type of the valid data.
     *
     * @example
     * ```ts
     * import { getValidator } from "@nimbus/core";
     *
     * getValidator().validate(
     *     'https://api.nimbus.overlap.at/schemas/command/v1',
     *     {
     *         foo: 'bar',
     *     },
     * );
     * ```
     */
    public validate<TData>(
        schema: string | SchemaObject,
        data: unknown,
    ): ValidationResult<TData> {
        let validateFunc: ValidateFunction<TData>;

        if (typeof schema === 'string') {
            const func = this._ajv.getSchema<TData>(schema);

            if (!func) {
                return {
                    data: undefined,
                    error: new GenericException('Schema not found', {
                        reason: `A string was provided for the schema
                            but no schema with id "${schema}" added to the validator.
                            Use the addSchema method to add a schema to the validator.`,
                    }),
                };
            }

            validateFunc = func;
        } else {
            validateFunc = this._ajv.compile(schema);
        }

        const isValid = validateFunc(data);

        if (isValid) {
            return { data: data as TData, error: undefined };
        } else {
            return {
                data: undefined,
                error: new InvalidInputException(
                    'The provided input is invalid',
                    {
                        issues: validateFunc.errors,
                    },
                ),
            };
        }
    }

    /**
     * Add a schema to the validator.
     *
     * @param {SchemaObject} schema - The JSON Schema to add.
     *
     * @throws {GenericException} If the schema does not have a $id property.
     *
     * @example
     * ```ts
     * import { getValidator } from "@nimbus/core";
     *
     * getValidator().addSchema({
     *     $id: "https://api.nimbus.overlap.at/schemas/recipe/v1",
     *     type: "object",
     *     properties: {
     *         foo: {
     *             type: "string",
     *         },
     *     },
     * });
     * ```
     */
    public addSchema(schema: SchemaObject): void {
        if (!schema.$id) {
            throw new GenericException('Schema must have a $id', {
                reason:
                    'The schema must have a $id to be added to the validator.',
            });
        }

        this._ajv.addSchema(schema, schema.$id);
    }
}

/**
 * Configure the Validator.
 *
 * @param {ValidatorOptions} options - The options for the Validator
 *
 * @example
 * ```ts
 * import {
 *     setupValidator,
 * } from "@nimbus/core";
 *
 * setupValidator({
 *     ajv: myCustomAjvInstance,
 * });
 * ```
 */
export const setupValidator = (options?: ValidatorOptions): void => {
    Validator.configure(options);
};

/**
 * Get the Validator instance.
 *
 * @returns {Validator} The Validator instance
 *
 * @example
 * ```ts
 * import { getValidator } from "@nimbus/core";
 *
 * const validator = getValidator();
 * ```
 */
export const getValidator = (): Validator => {
    return Validator.getInstance();
};
