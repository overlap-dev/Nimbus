import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nimbus-cqrs/core';
import { SYSTEM_ACTOR } from '../../../../shared/lib/messages.ts';
import {
    TICKET_STATUS_DONE,
    TICKET_STATUS_OPEN,
} from '../domain/status.value-object.ts';
import { applyEventToState } from '../domain/ticket.state.ts';
import {
    makeAuthContext,
    source,
    ticket,
    ticketId,
} from '../domain/ticket.test-fixtures.ts';
import { TICKET_ARCHIVED_EVENT_TYPE } from '../events/archived.event.ts';
import {
    ARCHIVE_TICKET_COMMAND_TYPE,
    type ArchiveTicketCommand,
    archiveTicket,
} from './archive.command.ts';

const makeCommand = (
    authcontext: ArchiveTicketCommand['authcontext'] = null,
): ArchiveTicketCommand => {
    return {
        type: ARCHIVE_TICKET_COMMAND_TYPE,
        source,
        correlationid: 'corr',
        authcontext,
        data: { ticketId },
    } as ArchiveTicketCommand;
};

test('the settled-archive watch archives a done Ticket as system', () => {
    const events = archiveTicket(
        ticket({ status: TICKET_STATUS_DONE }),
        makeCommand(),
    );

    assert.equal(events.length, 1);
    assert.equal(events[0].type, TICKET_ARCHIVED_EVENT_TYPE);
    assert.equal(events[0].data.actor, SYSTEM_ACTOR);

    const next = applyEventToState(
        ticket({ status: TICKET_STATUS_DONE }),
        events[0],
    );
    assert.equal(next?.archived, true);
    assert.equal(next?.status, TICKET_STATUS_DONE);
});

test('a Ticket that is not done is rejected', () => {
    assert.throws(
        () => {
            archiveTicket(
                ticket({ status: TICKET_STATUS_OPEN }),
                makeCommand(),
            );
        },
        { message: 'Only a Ticket in Status done can be archived' },
    );
});

test('an archived Ticket is unchanged', () => {
    const events = archiveTicket(
        ticket({ status: TICKET_STATUS_DONE, archived: true }),
        makeCommand(),
    );

    assert.deepEqual(events, []);
});

test('a User cannot issue archive', () => {
    assert.throws(() => {
        archiveTicket(
            ticket({ status: TICKET_STATUS_DONE }),
            makeCommand(makeAuthContext()),
        );
    }, ForbiddenException);
});
