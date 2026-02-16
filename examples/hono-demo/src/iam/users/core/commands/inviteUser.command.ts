import { commandSchema, InvalidInputException } from '@nimbus/core';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { UserState } from '../domain/user.ts';

export const INVITE_USER_COMMAND_TYPE = 'at.overlap.nimbus.invite-user';

export const inviteUserInputSchema = z.object({
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    group: z.string(),
});

export const inviteUserCommandSchema = commandSchema.extend({
    type: z.literal(INVITE_USER_COMMAND_TYPE),
    data: inviteUserInputSchema,
});
export type InviteUserCommand = z.infer<typeof inviteUserCommandSchema>;

export const inviteUser = (
    state: UserState,
    command: InviteUserCommand,
): UserState => {
    // Always make sure to cast all user emails to lowercase
    const email = command.data.email.toLowerCase();

    if (state && state.email === email) {
        throw new InvalidInputException('User with this email already exists');
    }

    return {
        _id: new ObjectId().toString(),
        email: email,
        firstName: command.data.firstName,
        lastName: command.data.lastName,
        group: command.data.group,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};
