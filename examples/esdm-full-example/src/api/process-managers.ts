import { startSettledArchiveWatch } from './ticketing/pm-settled-archive/shell/events/settled-archive.handler.ts';

// Background work that is not only an event consumer.
// The settled-archive watch also polls for timers that have come due.
// Its event consumer is registered with the observer in eventsourcingdb.ts.
export const initProcessManagers = (): void => {
    startSettledArchiveWatch();
};
