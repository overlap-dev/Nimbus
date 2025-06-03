import { z, type ZodType } from 'zod';
import { absoluteUri } from '../cloudEvent/absoluteUri.ts';
import { mediaType } from '../cloudEvent/mediaType.ts';
import { uriReference } from '../cloudEvent/uriReference.ts';
import { timeRFC3339 } from './timeRFC3339.ts';

// TODO: fix slow type issue

/**
 * Zod schema for the CloudEvent object.
 *
 * Nimbus respects the CloudEvents specifications
 * for messages like commands, queries and events.
 *
 * https://cloudevents.io/
 */
export const CloudEvent = <
    TType extends ZodType,
    TData extends ZodType,
>(
    typeType: TType,
    dataType: TData,
) => {
    return z.object({
        specversion: z.literal('1.0'),
        id: z.string().min(1),
        source: uriReference,
        type: typeType,
        data: dataType,
        subject: z.string().min(1).optional(),
        time: timeRFC3339.optional(),
        datacontenttype: mediaType.optional(),
        dataschema: absoluteUri.optional(),
    });
};

/**
 * Inference type to create the CloudEvent type.
 */
type CloudEventType<
    TType extends ZodType,
    TData extends ZodType,
> = ReturnType<typeof CloudEvent<TType, TData>>;

/**
 * The type of the CloudEvent object.
 *
 * Nimbus respects the CloudEvents specifications
 * for messages like commands, queries and events.
 *
 * https://cloudevents.io/
 */
export type CloudEvent<TType, TData> = z.infer<
    CloudEventType<ZodType<TType>, ZodType<TData>>
>;
