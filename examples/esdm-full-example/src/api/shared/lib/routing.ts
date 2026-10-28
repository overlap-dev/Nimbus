import type {
    Command,
    CreateCommandInput,
    CreateQueryInput,
    Query,
} from '@nimbus-cqrs/core';
import {
    createCommand,
    createQuery,
    InvalidInputException,
} from '@nimbus-cqrs/core';
import { getCorrelationId } from '@nimbus-cqrs/hono';
import type { Context } from 'hono';
import { getCommandRouter } from '../../command.router.ts';
import type { AuthContext } from '../../iam/dcb-auth/core/domain/auth-context.ts';
import { getAuthContext } from '../../iam/dcb-auth/shell/middleware/hono-auth.ts';
import { getQueryRouter } from '../../query.router.ts';
import { CLOUDEVENTS_SOURCE } from '../namespace.ts';

// TODO: We need to think about integrating this into the frameworks hono package

// The bridge from HTTP to the Nimbus routers.
//
// A route handler should not build messages by hand. routeCommand() and
// routeQuery() read the request, attach the auth context, and hand a
// typed message to the router. The router validates it and calls the
// registered handler. The same commands stay reachable from a policy
// or a process manager, which call the router directly and skip HTTP.

type AuthenticatedCommand = Command & {
    authcontext: AuthContext | null;
};

type AuthenticatedQuery = Query & {
    authcontext: AuthContext;
};

type RouteInput<TMessage, TResult> = {
    c: Context;
    type: TMessage extends { type: infer TType } ? TType : never;
    mapData?: (
        c: Context,
    ) => Record<string, unknown> | Promise<Record<string, unknown>>;
    transformResponse?: (result: TResult) => unknown | Promise<unknown>;
};

export const parseJsonBody = async (
    c: Context,
): Promise<Record<string, unknown>> => {
    try {
        return await c.req.json();
    } catch {
        throw new InvalidInputException('Invalid input', {
            errorCode: 'INVALID_INPUT',
            reason: 'The request body must be a JSON object',
        });
    }
};

const respond = async <TResult>(
    c: Context,
    result: TResult,
    transformResponse: RouteInput<unknown, TResult>['transformResponse'],
) => {
    const response = transformResponse
        ? await transformResponse(result)
        : result;

    return c.json(response as any, 200);
};

/**
 * Parse an HTTP request into a Nimbus command (with the AuthContext the
 * authentication middleware attached), route it, and return the handler
 * result as JSON (200).
 *
 * Body validation is deferred to the command schema registered on the router.
 */
export const routeCommand = async <
    TCommand extends AuthenticatedCommand,
    TResult = unknown,
>({
    type,
    c,
    mapData,
    transformResponse,
}: RouteInput<TCommand, TResult>) => {
    const data = mapData ? await mapData(c) : await parseJsonBody(c);

    const command = createCommand({
        type,
        source: CLOUDEVENTS_SOURCE,
        correlationid: getCorrelationId(c),
        data,
        authcontext: getAuthContext(c),
    } as unknown as CreateCommandInput<TCommand>);

    const result = (await getCommandRouter().route(command)) as TResult;

    return respond(c, result, transformResponse);
};

/**
 * Like `routeCommand`, but without AuthContext — for public commands such as
 * login.
 */
export const routePublicCommand = async <
    TCommand extends Command,
    TResult = unknown,
>({
    type,
    c,
    mapData,
    transformResponse,
}: RouteInput<TCommand, TResult>) => {
    const data = mapData ? await mapData(c) : await parseJsonBody(c);

    const command = createCommand({
        type,
        source: CLOUDEVENTS_SOURCE,
        correlationid: getCorrelationId(c),
        data,
    } as unknown as CreateCommandInput<TCommand>);

    const result = (await getCommandRouter().route(command)) as TResult;

    return respond(c, result, transformResponse);
};

/**
 * Parse an HTTP request into a Nimbus query (with the AuthContext the
 * authentication middleware attached), route it, and return the handler
 * result as JSON (200).
 *
 * Query parameter validation is deferred to the query schema registered on
 * the router. Pass `mapData` when the query string needs coercion.
 */
export const routeQuery = async <
    TQuery extends AuthenticatedQuery,
    TResult = unknown,
>({
    type,
    c,
    mapData,
    transformResponse,
}: RouteInput<TQuery, TResult>) => {
    const data = mapData ? await mapData(c) : c.req.query();

    const query = createQuery({
        type,
        source: CLOUDEVENTS_SOURCE,
        correlationid: getCorrelationId(c),
        data,
        authcontext: getAuthContext(c),
    } as unknown as CreateQueryInput<TQuery>);

    const result = (await getQueryRouter().route(query)) as TResult;

    return respond(c, result, transformResponse);
};
