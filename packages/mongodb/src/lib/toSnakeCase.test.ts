import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toSnakeCase } from './toSnakeCase.ts';

test('toSnakeCase converts PascalCase and camelCase', () => {
    assert.equal(toSnakeCase('UserAccount'), 'user_account');
    assert.equal(toSnakeCase('userAccount'), 'user_account');
});

test('toSnakeCase keeps acronyms together', () => {
    assert.equal(toSnakeCase('HTMLElement'), 'html_element');
    assert.equal(toSnakeCase('userID'), 'user_id');
});

test('toSnakeCase splits on whitespace, dashes and digits', () => {
    assert.equal(toSnakeCase('user account'), 'user_account');
    assert.equal(toSnakeCase('user-account'), 'user_account');
    assert.equal(toSnakeCase('Order2Item'), 'order_2_item');
});

test('toSnakeCase handles already snake_cased and empty input', () => {
    assert.equal(toSnakeCase('user_account'), 'user_account');
    assert.equal(toSnakeCase(''), '');
});
