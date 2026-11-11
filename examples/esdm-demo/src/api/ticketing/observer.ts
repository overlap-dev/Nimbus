// The name of the observer that feeds the ticketing consumers. It is
// stored on every checkpoint and used to look the observer up, e.g. to
// check whether it has caught up with the log. The observer itself is
// wired in api/eventsourcingdb.ts.
export const TICKETING_OBSERVER_NAME = 'ticketing';
