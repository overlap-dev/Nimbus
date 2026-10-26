import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AuthContext } from '../../iam/dcb-auth/core/domain/auth-context.ts';
import { actorFromAuthContext, actorSchema, SYSTEM_ACTOR } from './messages.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const authcontext: AuthContext = {
    sessionId: '22222222-2222-4222-8222-222222222222',
    userId,
    expiresAt: '2026-08-13T13:00:00.000Z',
};

test('actorFromAuthContext maps the authenticated user-id', () => {
    assert.equal(actorFromAuthContext(authcontext), userId);
    assert.equal(actorSchema.parse(userId), userId);
});

test('actorFromAuthContext falls back to system when unauthenticated', () => {
    assert.equal(actorFromAuthContext(null), SYSTEM_ACTOR);
    assert.equal(actorSchema.parse(SYSTEM_ACTOR), SYSTEM_ACTOR);
});
