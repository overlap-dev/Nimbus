import type { z, ZodType } from 'zod';
import { CloudEvent } from '../cloudEvent/cloudEvent.ts';
import { MessageEnvelope } from '../messageEnvelope.ts';

// TODO: fix slow type issue

/**
 * Zod schema for the Query object.
 */
export const Query = <
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
 * Inference type to create the Query type.
 */
type QueryType<
    TType extends ZodType,
    TData extends ZodType,
    TAuthContext extends ZodType,
> = ReturnType<typeof Query<TType, TData, TAuthContext>>;

/**
 * The type of the Query object.
 */
export type Query<TType, TData, TAuthContext> = z.infer<
    QueryType<ZodType<TType>, ZodType<TData>, ZodType<TAuthContext>>
>;
