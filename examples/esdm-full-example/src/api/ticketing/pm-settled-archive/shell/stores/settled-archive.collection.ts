import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

export const TICKETING_PM_SETTLED_ARCHIVE_COLLECTION: MongoCollectionDefinition =
    {
        name: 'ticketing_pm_settled_archive',
        indexes: [
            { key: { ticketId: 1 }, unique: true },
            { key: { archiveDueAt: 1 } },
        ],
    };
