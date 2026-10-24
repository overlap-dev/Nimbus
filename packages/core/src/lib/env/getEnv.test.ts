import assert from 'node:assert/strict';
import process from 'node:process';
import { test } from 'node:test';
import { GenericException } from '../exception/genericException.ts';
import { getEnv } from './getEnv.ts';

const PREFIX = 'NIMBUS_GETENV_TEST_';

const setEnv = (name: string, value: string | undefined) => {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
};

test('getEnv returns all requested variables when present', () => {
    const a = `${PREFIX}PRESENT_A`;
    const b = `${PREFIX}PRESENT_B`;

    setEnv(a, 'value-a');
    setEnv(b, 'value-b');

    try {
        const env = getEnv({ variables: [a, b] });

        assert.deepEqual(env[a], 'value-a');
        assert.deepEqual(env[b], 'value-b');
    } finally {
        setEnv(a, undefined);
        setEnv(b, undefined);
    }
});

test('getEnv throws GenericException when one variable is missing', () => {
    const present = `${PREFIX}ONE_PRESENT`;
    const missing = `${PREFIX}ONE_MISSING`;

    setEnv(present, 'ok');
    setEnv(missing, undefined);

    try {
        assert.throws(
            () => getEnv({ variables: [present, missing] }),
            (error: unknown) => {
                assert.ok(error instanceof GenericException);
                assert.match(error.message, /Undefined environment variables/);
                assert.deepEqual(error.details, {
                    undefinedVariables: [missing],
                });
                return true;
            },
        );
    } finally {
        setEnv(present, undefined);
    }
});

test('getEnv throws GenericException when all variables are missing', () => {
    const a = `${PREFIX}ALL_MISSING_A`;
    const b = `${PREFIX}ALL_MISSING_B`;

    setEnv(a, undefined);
    setEnv(b, undefined);

    assert.throws(
        () => getEnv({ variables: [a, b] }),
        (error: unknown) => {
            assert.ok(error instanceof GenericException);
            assert.match(error.message, /Undefined environment variables/);
            assert.deepEqual(error.details, {
                undefinedVariables: [a, b],
            });
            return true;
        },
    );
});

test('getEnv treats empty string as missing', () => {
    const empty = `${PREFIX}EMPTY`;

    setEnv(empty, '');

    try {
        assert.throws(
            () => getEnv({ variables: [empty] }),
            (error: unknown) => {
                assert.ok(error instanceof GenericException);
                assert.match(error.message, /Undefined environment variables/);
                assert.deepEqual(error.details, {
                    undefinedVariables: [empty],
                });
                return true;
            },
        );
    } finally {
        setEnv(empty, undefined);
    }
});
