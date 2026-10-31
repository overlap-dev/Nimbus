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

test('getEnv returns an empty object when no names are requested', () => {
    assert.deepEqual(getEnv({}), {});
});

test('getEnv returns a present optional variable', () => {
    const name = `${PREFIX}OPT_PRESENT`;

    setEnv(name, 'value');

    try {
        const env = getEnv({ optionalVariables: [name] });

        assert.equal(env[name], 'value');
    } finally {
        setEnv(name, undefined);
    }
});

test('getEnv returns undefined for a missing optional variable', () => {
    const name = `${PREFIX}OPT_MISSING`;

    setEnv(name, undefined);

    const env = getEnv({ optionalVariables: [name] });

    assert.equal(env[name], undefined);
});

test('getEnv treats an empty optional variable as undefined', () => {
    const empty = `${PREFIX}OPT_EMPTY`;

    setEnv(empty, '');

    try {
        const env = getEnv({ optionalVariables: [empty] });

        assert.equal(env[empty], undefined);
    } finally {
        setEnv(empty, undefined);
    }
});

test('getEnv returns optional variables without a required list', () => {
    const present = `${PREFIX}OPT_ONLY_PRESENT`;
    const missing = `${PREFIX}OPT_ONLY_MISSING`;

    setEnv(present, 'value');
    setEnv(missing, undefined);

    try {
        const env = getEnv({
            optionalVariables: [present, missing],
        });

        assert.equal(env[present], 'value');
        assert.equal(env[missing], undefined);
    } finally {
        setEnv(present, undefined);
        setEnv(missing, undefined);
    }
});

test('getEnv throws only for missing required variables', () => {
    const required = `${PREFIX}MIX_REQUIRED`;
    const optional = `${PREFIX}MIX_OPTIONAL`;

    setEnv(required, undefined);
    setEnv(optional, undefined);

    try {
        assert.throws(
            () =>
                getEnv({
                    variables: [required],
                    optionalVariables: [optional],
                }),
            (error: unknown) => {
                assert.ok(error instanceof GenericException);
                assert.match(error.message, /Undefined environment variables/);
                assert.deepEqual(error.details, {
                    undefinedVariables: [required],
                });
                return true;
            },
        );
    } finally {
        setEnv(required, undefined);
        setEnv(optional, undefined);
    }
});

test('getEnv treats a name listed in both arrays as required', () => {
    const name = `${PREFIX}BOTH`;

    setEnv(name, undefined);

    try {
        assert.throws(
            () =>
                getEnv({
                    variables: [name],
                    optionalVariables: [name],
                }),
            (error: unknown) => {
                assert.ok(error instanceof GenericException);
                assert.match(error.message, /Undefined environment variables/);
                assert.deepEqual(error.details, {
                    undefinedVariables: [name],
                });
                return true;
            },
        );
    } finally {
        setEnv(name, undefined);
    }
});

test('getEnv types required names as string and optional names as string | undefined', () => {
    const requiredName = 'NIMBUS_GETENV_TEST_TYPE_REQUIRED';
    const optionalName = 'NIMBUS_GETENV_TEST_TYPE_OPTIONAL';

    setEnv(requiredName, 'required-value');
    setEnv(optionalName, undefined);

    try {
        const env = getEnv({
            variables: ['NIMBUS_GETENV_TEST_TYPE_REQUIRED'],
            optionalVariables: ['NIMBUS_GETENV_TEST_TYPE_OPTIONAL'],
        });

        const required: string = env.NIMBUS_GETENV_TEST_TYPE_REQUIRED;
        const optional: string | undefined =
            env.NIMBUS_GETENV_TEST_TYPE_OPTIONAL;

        assert.equal(required, 'required-value');
        assert.equal(optional, undefined);

        // @ts-expect-error optional names are not a definite string
        const _optionalAsString: string = env.NIMBUS_GETENV_TEST_TYPE_OPTIONAL;

        // @ts-expect-error unrequested names are not on the result
        const _unrequested = env.NIMBUS_GETENV_TEST_TYPE_UNREQUESTED;
    } finally {
        setEnv(requiredName, undefined);
        setEnv(optionalName, undefined);
    }
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
