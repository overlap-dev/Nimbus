import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

// TODO: rework router, eventBus and logging implementations
// to work with CloudEvents and MessageEnvelope.
//
// Also Update the docs and examples to include the concept of messages (CloudEvents)
// which are then used for commands, queries and events.
// Include examples for good naming conventions for source and type of the cloudEvents.

/**
 * Zod schema for the MessageEnvelope.
 *
 * As Nimbus uses the CloudEvents specification
 * for all messages like commands, queries and events,
 * there needs to be a place to add Nimbus specific
 * meta information to messages.
 *
 * This is what the MessageEnvelope is used for.
 * It contains the a correlationId and an optional authContext
 * along with the actual payload.
 */
export const MessageEnvelope = <
    TPayload extends ZodType,
    TAuthContext extends ZodType,
>(
    payloadType: TPayload,
    authContextType: TAuthContext,
) => {
    return z.object({
        payload: payloadType,
        correlationId: z.string(),
        authContext: authContextType.optional(),
    });
};

/**
 * Inference type to create the MessageEnvelope type.
 */
type MessageEnvelopeType<
    TPayload extends ZodType,
    TAuthContext extends ZodType,
> = ReturnType<typeof MessageEnvelope<TPayload, TAuthContext>>;

/**
 * The type of the MessageEnvelope.
 *
 * As Nimbus uses the CloudEvents specification
 * for all messages like commands, queries and events,
 * there needs to be a place to add Nimbus specific
 * meta information to messages.
 *
 * This is what the MessageEnvelope is used for.
 * It contains the a correlationId and an optional authContext
 * along with the actual payload.
 */
export type MessageEnvelope<TPayload, TAuthContext> = z.infer<
    MessageEnvelopeType<ZodType<TPayload>, ZodType<TAuthContext>>
>;
