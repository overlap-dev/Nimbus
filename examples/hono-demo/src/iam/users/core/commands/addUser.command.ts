import { commandSchema, InvalidInputException } from '@nimbus/core';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { UserState } from '../domain/user.ts';

export const ADD_USER_COMMAND_TYPE = 'at.overlap.nimbus.add-user';

export const addUserInputSchema = z.object({
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    group: z.string(),
});

export const addUserCommandSchema = commandSchema.extend({
    type: z.literal(ADD_USER_COMMAND_TYPE),
    data: addUserInputSchema,
});
export type AddUserCommand = z.infer<typeof addUserCommandSchema>;

export const addUser = (
    state: UserState,
    command: AddUserCommand,
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
