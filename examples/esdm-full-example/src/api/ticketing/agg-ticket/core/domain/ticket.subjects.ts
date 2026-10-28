// Here we define the subject for the ticket aggregate.
// It is then reused across all write and read operations
// on the event store.

export const ticketSubjectPrefix = (): string => {
    return '/ticketing/tickets/';
};

// The subject path for reading all ticket events
export const ticketsSubject = (): string => {
    return '/ticketing/tickets';
};

// The subject path for reading the events of a specific ticket
export const ticketSubject = (ticketId: string): string => {
    return `${ticketSubjectPrefix()}${ticketId}`;
};
