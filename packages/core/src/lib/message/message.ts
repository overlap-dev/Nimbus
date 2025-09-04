import type { Command } from './command.ts';
import type { Event } from './event.ts';
import type { Query } from './query.ts';

/**
 * A message is a communication object that can be passed between
 * systems, modules, functions etc.
 *
 * In the Nimbus ecosystem it is either a Command, Event or Query.
 *
 * Nimbus sticks to the CloudEvents specifications for all messages
 * to make it easier to work with these messages across multiple systems.
 *
 * @see https://cloudevents.io/ for more information.
 *
 * @template TData - The type of the data.
 */
export type Message<TData = unknown> =
    | Command<TData>
    | Event<TData>
    | Query<TData>;
