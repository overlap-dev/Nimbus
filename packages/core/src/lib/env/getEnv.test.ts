import { assertEquals, assertInstanceOf, assertThrows } from '@std/assert';
import process from 'node:process';
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

Deno.test('getEnv returns all requested variables when present', () => {
    const a = `${PREFIX}PRESENT_A`;
    const b = `${PREFIX}PRESENT_B`;

    setEnv(a, 'value-a');
    setEnv(b, 'value-b');

    try {
        const env = getEnv({ variables: [a, b] });

        assertEquals(env[a], 'value-a');
        assertEquals(env[b], 'value-b');
    } finally {
        setEnv(a, undefined);
        setEnv(b, undefined);
    }
});

Deno.test('getEnv throws GenericException when one variable is missing', () => {
    const present = `${PREFIX}ONE_PRESENT`;
    const missing = `${PREFIX}ONE_MISSING`;

    setEnv(present, 'ok');
    setEnv(missing, undefined);

    try {
        const error = assertThrows(
            () => getEnv({ variables: [present, missing] }),
            GenericException,
            'Undefined environment variables',
        );

        assertInstanceOf(error, GenericException);
        assertEquals(error.details, {
            undefinedVariables: [missing],
        });
    } finally {
        setEnv(present, undefined);
    }
});

Deno.test('getEnv throws GenericException when all variables are missing', () => {
    const a = `${PREFIX}ALL_MISSING_A`;
    const b = `${PREFIX}ALL_MISSING_B`;

    setEnv(a, undefined);
    setEnv(b, undefined);

    const error = assertThrows(
        () => getEnv({ variables: [a, b] }),
        GenericException,
        'Undefined environment variables',
    );

    assertInstanceOf(error, GenericException);
    assertEquals(error.details, {
        undefinedVariables: [a, b],
    });
});

Deno.test('getEnv treats empty string as missing', () => {
    const empty = `${PREFIX}EMPTY`;

    setEnv(empty, '');

    try {
        const error = assertThrows(
            () => getEnv({ variables: [empty] }),
            GenericException,
            'Undefined environment variables',
        );

        assertInstanceOf(error, GenericException);
        assertEquals(error.details, {
            undefinedVariables: [empty],
        });
    } finally {
        setEnv(empty, undefined);
    }
});
