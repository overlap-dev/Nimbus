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

test('getEnv types every value as string | undefined when the required list is widened', () => {
    const requiredName = 'NIMBUS_GETENV_TEST_WIDE_HOST';
    const optionalName = 'NIMBUS_GETENV_TEST_WIDE_TOKEN';
    const names: string[] = [requiredName];

    setEnv(requiredName, 'host-value');
    setEnv(optionalName, undefined);

    try {
        const env = getEnv({
            variables: names,
            optionalVariables: ['NIMBUS_GETENV_TEST_WIDE_TOKEN'],
        });

        const host: string | undefined = env.NIMBUS_GETENV_TEST_WIDE_HOST;
        const token: string | undefined = env.NIMBUS_GETENV_TEST_WIDE_TOKEN;

        assert.equal(host, 'host-value');
        assert.equal(token, undefined);

        // @ts-expect-error widened required lists do not type optional names as string
        const _token: string = env.NIMBUS_GETENV_TEST_WIDE_TOKEN;

        // @ts-expect-error widened required names are string | undefined
        const _host: string = env.NIMBUS_GETENV_TEST_WIDE_HOST;
    } finally {
        setEnv(requiredName, undefined);
        setEnv(optionalName, undefined);
    }
});

test('getEnv treats unset prototype names as missing optional variables', () => {
    setEnv('toString', undefined);
    setEnv('constructor', undefined);

    try {
        const env = getEnv({
            optionalVariables: ['toString', 'constructor'],
        });

        assert.equal(env.toString, undefined);
        assert.equal(env.constructor, undefined);
    } finally {
        setEnv('toString', undefined);
        setEnv('constructor', undefined);
    }
});

test('getEnv treats an unset prototype name as a missing required variable', () => {
    setEnv('toString', undefined);

    try {
        assert.throws(
            () => getEnv({ variables: ['toString'] }),
            (error: unknown) => {
                assert.ok(error instanceof GenericException);
                assert.match(error.message, /Undefined environment variables/);
                assert.deepEqual(error.details, {
                    undefinedVariables: ['toString'],
                });
                return true;
            },
        );
    } finally {
        setEnv('toString', undefined);
    }
});

test('getEnv returns a configured __proto__ variable as its own value', () => {
    setEnv('__proto__', 'configured-proto');

    try {
        const env = getEnv({
            optionalVariables: ['__proto__'],
        });

        assert.equal(Object.hasOwn(env, '__proto__'), true);
        assert.equal(
            Object.getOwnPropertyDescriptor(env, '__proto__')?.value,
            'configured-proto',
        );
    } finally {
        setEnv('__proto__', undefined);
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
