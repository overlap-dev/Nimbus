import type { Document, Filter } from 'mongodb';

/**
 * Drops undefined clauses and returns a single filter.
 * Zero clauses become `{}`, one clause is returned as-is, and several
 * clauses are wrapped in `$and`.
 */
export const compactAnd = (
    clauses: Array<Filter<Document> | undefined>,
): Filter<Document> => {
    const present = clauses.filter((clause): clause is Filter<Document> => {
        return clause !== undefined;
    });

    if (present.length === 0) {
        return {};
    }

    if (present.length === 1) {
        return present[0];
    }

    return { $and: present };
};
