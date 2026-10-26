export const ticketSubjectPrefix = (): string => {
    return '/ticketing/tickets/';
};

export const ticketsSubject = (): string => {
    return '/ticketing/tickets';
};

export const ticketSubject = (ticketId: string): string => {
    return `${ticketSubjectPrefix()}${ticketId}`;
};
