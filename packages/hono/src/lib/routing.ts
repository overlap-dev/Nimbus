import {
    type Command,
    type CreateCommandInput,
    type CreateQueryInput,
    createCommand,
    createQuery,
    InvalidInputException,
    type Query,
} from '@nimbus-cqrs/core';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { getCorrelationId } from './middleware/correlationId.ts';

/**
 * Anything that can route a Nimbus message.
 *
 * `MessageRouter` from `@nimbus-cqrs/core` satisfies this.
 */
export type MessageRouteTarget = {
    /**
     * Route a command or query to its registered handler.
     *
     * @param message - The CloudEvents message to route.
     * @returns The handler result.
     */
    route: (message: unknown) => unknown;
};

/**
 * Reads message `data` from the Hono context.
 *
 * Commands default to the JSON body. Queries default to the query string.
 * Provide this when the request needs a different shape. The payload may be
 * any value the message schema accepts, including a string, number, boolean,
 * array, or object.
 *
 * @template TData - The message `data` value. Defaults to `unknown`.
 */
export type RouteDataMapper<TData = unknown> = (
    c: Context,
) => TData | Promise<TData>;

/**
 * HTTP response built from a command or query handler result.
 *
 * `data` is the response body. It is serialized as JSON when `Content-Type`
 * is omitted, `application/json`, or a type ending in `+json`. Any other
 * content type sends `data` unchanged, such as a string or image bytes.
 * Omit `statusCode` to keep `200`. Omit `Content-Type` to keep
 * `application/json`.
 */
export type TransformResponseOutput = {
    /**
     * Response body. JSON values are serialized for JSON content types.
     * Other content types send this value as given.
     */
    data: unknown;
    /**
     * Extra response headers. `Content-Type` defaults to `application/json`.
     */
    headers?: Record<string, string | string[]>;
    /**
     * HTTP status. Defaults to 200.
     */
    statusCode?: ContentfulStatusCode;
};

/**
 * CloudEvents attributes the route adapter does not set itself.
 *
 * `type`, `source`, `data`, and `correlationid` are filled by the adapter.
 * Use this for any other attribute the message type declares, including
 * application extension attributes such as `authcontext`.
 */
export type RouteCommandExtensions<TCommand extends Command> = Partial<
    Omit<
        CreateCommandInput<TCommand>,
        'type' | 'source' | 'data' | 'correlationid'
    >
>;

/**
 * CloudEvents attributes the route adapter does not set itself.
 *
 * `type`, `source`, `data`, and `correlationid` are filled by the adapter.
 * Use this for any other attribute the message type declares, including
 * application extension attributes such as `authcontext`.
 */
export type RouteQueryExtensions<TQuery extends Query> = Partial<
    Omit<CreateQueryInput<TQuery>, 'type' | 'source' | 'data' | 'correlationid'>
>;

/**
 * Input for {@link routeCommand}.
 *
 * @template TCommand - The command type to create.
 * @template TResult - The type of the handler result.
 */
export type RouteCommandInput<TCommand extends Command, TResult = unknown> = {
    /**
     * The Hono context for the current request.
     */
    c: Context;
    /**
     * The router that handles the command.
     */
    router: MessageRouteTarget;
    /**
     * The command type.
     */
    type: TCommand['type'];
    /**
     * CloudEvents source of the command.
     */
    source: string;
    /**
     * Builds `data` from the request. Defaults to the JSON body.
     */
    mapInputData?: RouteDataMapper;
    /**
     * Extra CloudEvents attributes copied onto the command.
     */
    extensions?: RouteCommandExtensions<TCommand>;
    /**
     * Maps the handler result to the JSON body, status, and headers.
     * Defaults to the result as JSON with status 200.
     */
    transformResponse?: (
        result: TResult,
    ) => TransformResponseOutput | Promise<TransformResponseOutput>;
};

/**
 * Input for {@link routeQuery}.
 *
 * @template TQuery - The query type to create.
 * @template TResult - The type of the handler result.
 */
export type RouteQueryInput<TQuery extends Query, TResult = unknown> = {
    /**
     * The Hono context for the current request.
     */
    c: Context;
    /**
     * The router that handles the query.
     */
    router: MessageRouteTarget;
    /**
     * The query type.
     */
    type: TQuery['type'];
    /**
     * CloudEvents source of the query.
     */
    source: string;
    /**
     * Builds `data` from the request. Defaults to the query string.
     */
    mapInputData?: RouteDataMapper;
    /**
     * Extra CloudEvents attributes copied onto the query.
     */
    extensions?: RouteQueryExtensions<TQuery>;
    /**
     * Maps the handler result to the JSON body, status, and headers.
     * Defaults to the result as JSON with status 200.
     */
    transformResponse?: (
        result: TResult,
    ) => TransformResponseOutput | Promise<TransformResponseOutput>;
};

const parseJsonBody = async (c: Context): Promise<unknown> => {
    try {
        return await c.req.json();
    } catch {
        throw new InvalidInputException('Invalid input', {
            errorCode: 'INVALID_INPUT',
            reason: 'The request body must be a JSON object',
        });
    }
};

const JSON_CONTENT_TYPE = 'application/json';

const headerValue = (
    headers: Record<string, string | string[]> | undefined,
    name: string,
): string | undefined => {
    if (!headers) {
        return undefined;
    }

    const key = Object.keys(headers).find(
        (headerName) => headerName.toLowerCase() === name,
    );

    if (!key) {
        return undefined;
    }

    const value = headers[key];

    return Array.isArray(value) ? value[0] : value;
};

/**
 * JSON content types are serialized. Missing `Content-Type` counts as JSON.
 * `application/problem+json` and other `+json` types count as JSON.
 */
const isJsonContentType = (contentType: string | undefined): boolean => {
    if (contentType === undefined) {
        return true;
    }

    const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();

    return (
        mediaType === JSON_CONTENT_TYPE || mediaType?.endsWith('+json') === true
    );
};

const respond = async <TResult>(
    c: Context,
    result: TResult,
    transformResponse?: RouteCommandInput<
        Command,
        TResult
    >['transformResponse'],
) => {
    if (!transformResponse) {
        return c.json(result as any, 200);
    }

    const output = await transformResponse(result);
    const statusCode = output.statusCode ?? 200;
    const contentType = headerValue(output.headers, 'content-type');

    if (isJsonContentType(contentType)) {
        return c.json(output.data as any, statusCode, output.headers);
    }

    return c.body(output.data as any, statusCode, output.headers);
};

/**
 * Parse an HTTP request into a Nimbus command, route it, and return the
 * handler result as JSON. The status defaults to 200.
 *
 * `correlationid` comes from {@link getCorrelationId}. The JSON body
 * becomes `data`, unless `mapInputData` is set. Pass `extensions` for any
 * other CloudEvents attribute the command type declares, such as an
 * application auth context. Nimbus does not interpret those attributes.
 *
 * Schema validation stays on the router. A body that is not JSON throws
 * {@link InvalidInputException}.
 *
 * Policies and process managers keep calling the router directly. This
 * adapter is only the HTTP entry.
 *
 * @template TCommand - The command type to create.
 * @template TResult - The type of the handler result.
 *
 * @param input - Request, router, and command identity.
 * @returns JSON response. Status defaults to 200.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { getRouter } from '@nimbus-cqrs/core';
 * import { routeCommand } from '@nimbus-cqrs/hono';
 *
 * app.post('/create', (c) => {
 *     return routeCommand<CreateTicketCommand, CreateTicketCommandResult>({
 *         c,
 *         router: getRouter('MyCommandRouter'),
 *         source: 'https://nimbus.overlap.at',
 *         type: CREATE_TICKET_COMMAND_TYPE,
 *         extensions: { authcontext: getAuthContext(c) },
 *     });
 * });
 * ```
 */
export const routeCommand = async <
    TCommand extends Command,
    TResult = unknown,
>({
    c,
    router,
    type,
    source,
    mapInputData,
    extensions,
    transformResponse,
}: RouteCommandInput<TCommand, TResult>) => {
    const data = mapInputData ? await mapInputData(c) : await parseJsonBody(c);

    const command = createCommand({
        ...extensions,
        type,
        source,
        correlationid: getCorrelationId(c),
        data,
    } as unknown as CreateCommandInput<TCommand>);

    const result = (await router.route(command)) as TResult;

    return respond(c, result, transformResponse);
};

/**
 * Parse an HTTP request into a Nimbus query, route it, and return the
 * handler result as JSON. The status defaults to 200.
 *
 * `correlationid` comes from {@link getCorrelationId}. The query string
 * becomes `data`, unless `mapInputData` is set. Pass `extensions` for any
 * other CloudEvents attribute the query type declares, such as an
 * application auth context. Nimbus does not interpret those attributes.
 *
 * Schema validation stays on the router.
 *
 * @template TQuery - The query type to create.
 * @template TResult - The type of the handler result.
 *
 * @param input - Request, router, and query identity.
 * @returns JSON response. Status defaults to 200.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { getRouter } from '@nimbus-cqrs/core';
 * import { routeQuery } from '@nimbus-cqrs/hono';
 *
 * app.get('/list-tickets', (c) => {
 *     return routeQuery<ListTicketsQuery, ListTicketsQueryResult>({
 *         c,
 *         router: getRouter('MyQueryRouter'),
 *         source: 'https://nimbus.overlap.at',
 *         type: LIST_TICKETS_QUERY_TYPE,
 *         mapInputData: (context) => ({
 *             status: context.req.query('status'),
 *         }),
 *         extensions: { authcontext: getAuthContext(c) },
 *     });
 * });
 * ```
 */
export const routeQuery = async <TQuery extends Query, TResult = unknown>({
    c,
    router,
    type,
    source,
    mapInputData,
    extensions,
    transformResponse,
}: RouteQueryInput<TQuery, TResult>) => {
    const data = mapInputData ? await mapInputData(c) : c.req.query();

    const query = createQuery({
        ...extensions,
        type,
        source,
        correlationid: getCorrelationId(c),
        data,
    } as unknown as CreateQueryInput<TQuery>);

    const result = (await router.route(query)) as TResult;

    return respond(c, result, transformResponse);
};
