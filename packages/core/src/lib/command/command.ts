import type { z, ZodType } from 'zod';
import { CloudEvent } from '../cloudEvent/cloudEvent.ts';
import { MessageEnvelope } from '../messageEnvelope.ts';

// TODO: fix slow type issue

/**
 * Zod schema for the Command object.
 */
export const Command = <
    TType extends ZodType,
    TData extends ZodType,
    TAuthContext extends ZodType,
>(
    typeType: TType,
    dataType: TData,
    authContextType: TAuthContext,
) => {
    return CloudEvent(
        typeType,
        MessageEnvelope(dataType, authContextType),
    );
};

/**
 * Inference type to create the Command type.
 */
type CommandType<
    TType extends ZodType,
    TData extends ZodType,
    TAuthContext extends ZodType,
> = ReturnType<typeof Command<TType, TData, TAuthContext>>;

/**
 * The type of the Command object.
 */
export type Command<TType, TData, TAuthContext> = z.infer<
    CommandType<ZodType<TType>, ZodType<TData>, ZodType<TAuthContext>>
>;
