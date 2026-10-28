import { commandSchema, createEvent } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { actorFromAuthContext } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { ticketAlreadyExistsException } from '../domain/ticket.exceptions.ts';
import type { TicketState } from '../domain/ticket.state.ts';
import { ticketSubject } from '../domain/ticket.subjects.ts';
import {
    TICKET_CREATED_EVENT_TYPE,
    type TicketCreatedEvent,
} from '../events/created.event.ts';

// Each message needs its unique type.
// We want to stick to the CloudEvents naming convention
// and use a reversed domain name as a namespace,
// followed by aggregate and command name.
export const CREATE_TICKET_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.create`;

// We define a schema for the commands data object.
export const createTicketInputSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
});

// To create the schema and type for the command
// we extend the Nimbus base command schema with the specific
// type and the data schema.
export const createTicketCommandSchema = commandSchema.extend({
    type: z.literal(CREATE_TICKET_COMMAND_TYPE),
    data: createTicketInputSchema,

    // This is just an example on how authentication
    // context could be passed as an extension attribute.
    authcontext: authContextSchema,
});
export type CreateTicketCommand = z.infer<typeof createTicketCommandSchema>;

// This is the core logic for command.
//
// Based on the current state and the command data
// we create the resulting events.
//
// As mentioned in the architecture section of the guide
// we keep the core logic pure and without side effects.
//
// This way we can easily define all the business rules and constraints
// in one place. This is the purpose the application exists for.
//
// The function arguments define the information necessary to apply the
// business rules and constraints. Most often the state and command will
// be enough. But in this case we also get a ticketId from the shell.
//
// Testing all business scenarios is dead simple with unit tests.
//
// GIVEN: state = A
//   AND: command = B
// WHEN: createTicket(state, command)
// THEN: [EventA, EventB]
export const createTicket = (
    state: TicketState,
    command: CreateTicketCommand,
    ticketId: string,
): [TicketCreatedEvent] => {
    if (state !== null) {
        throw ticketAlreadyExistsException();
    }

    const ticketCreatedEvent = createEvent<TicketCreatedEvent>({
        source: command.source,
        subject: ticketSubject(ticketId),
        type: TICKET_CREATED_EVENT_TYPE,
        data: {
            actor: actorFromAuthContext(command.authcontext),
            ticketId,
            title: command.data.title,
            ...(command.data.description !== undefined
                ? { description: command.data.description }
                : {}),
            reporter: command.authcontext.userId,
        },
        correlationid: command.correlationid,
    });

    return [ticketCreatedEvent];
};
