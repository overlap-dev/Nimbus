import { InvalidInputException, NotFoundException } from '@nimbus-cqrs/core';

// Usually you want to define explicit exception with clear error codes
// This is a central place to define all exceptions related to the
// ticket aggregate.

export const TICKET_ERROR_CODES = {
    TICKET_ALREADY_EXISTS: 'TICKET_ALREADY_EXISTS',
    TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
    IN_PROGRESS_REQUIRES_ASSIGNEE: 'IN_PROGRESS_REQUIRES_ASSIGNEE',
    TICKET_NOT_DONE: 'TICKET_NOT_DONE',
} as const;

export const ticketAlreadyExistsException = (): InvalidInputException => {
    return new InvalidInputException('Ticket already exists', {
        errorCode: TICKET_ERROR_CODES.TICKET_ALREADY_EXISTS,
    });
};

export const ticketNotFoundException = (): NotFoundException => {
    return new NotFoundException('Ticket not found', {
        errorCode: TICKET_ERROR_CODES.TICKET_NOT_FOUND,
    });
};

export const inProgressRequiresAssigneeException =
    (): InvalidInputException => {
        return new InvalidInputException(
            'A Ticket in-progress always has an Assignee',
            {
                errorCode: TICKET_ERROR_CODES.IN_PROGRESS_REQUIRES_ASSIGNEE,
            },
        );
    };

export const ticketNotDoneException = (): InvalidInputException => {
    return new InvalidInputException(
        'Only a Ticket in Status done can be archived',
        { errorCode: TICKET_ERROR_CODES.TICKET_NOT_DONE },
    );
};
