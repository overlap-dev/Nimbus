import { commandSchema, createEvent, Exception } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { UserState } from '../domain/user.state.ts';
import {
    USER_INVITED_EVENT_TYPE,
    UserInvitedEvent,
} from '../events/userInvited.event.ts';

// Each message needs its unique type.
// We want to stick to the CloudEvents naming convention
// and use a reversed domain name as a namespace,
// followed by command name.
export const INVITE_USER_COMMAND_TYPE = 'at.overlap.nimbus.invite-user';

// We define a schema for the commands data object.
export const inviteUserInputSchema = z.object({
    email: z.email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
});

// To create the schema and type for the invite user command
// we extend the Nimbus base command schema with the specific
// type and the data schema.
export const inviteUserCommandSchema = commandSchema.extend({
    type: z.literal(INVITE_USER_COMMAND_TYPE),
    data: inviteUserInputSchema,
});
export type InviteUserCommand = z.infer<typeof inviteUserCommandSchema>;

// This is the core logic for the invite user command.
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
// be enough. But in this case it could also be important to know if the
// requested email address is still pristine in the system.
//
// Test all business scenarios dead simple with unit tests.
//
// GIVEN: state = A
//   AND: command = B
// WHEN: inviteUser(state, command)
// THEN: [EventA, EventB]
export const inviteUser = (
    state: UserState,
    command: InviteUserCommand,
    isEmailPristine: boolean,
): [UserInvitedEvent] => {
    const email = command.data.email.toLowerCase();

    if (!isEmailPristine) {
        throw new Exception(
            'CONFLICT',
            'The email address is already used',
            {
                errorCode: 'EMAIL_ALREADY_USED',
                email: command.data.email,
            },
            409,
        );
    }

    const userInvitedEvent = createEvent<UserInvitedEvent>({
        type: USER_INVITED_EVENT_TYPE,
        source: command.source,
        correlationid: command.correlationid,
        subject: `/users/${state.id}`,
        data: {
            id: state.id,
            email: email,
            firstName: command.data.firstName,
            lastName: command.data.lastName,
            invitedAt: new Date().toISOString(),
        },
    });

    return [userInvitedEvent];
};
