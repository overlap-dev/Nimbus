type EventSourcingDBEvent = {
    source: string;
    subject: string;
    type: string;
    data: any;
};

export interface RecipeEventStore {
    writeEvents: (events: EventSourcingDBEvent[]) => Promise<any>;
}
