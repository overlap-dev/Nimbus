// Word splitting mirrors `toSnakeCase` from the Deno standard library
// (`@std/text`, MIT license) so error codes stay identical to earlier releases.
const CAPITALIZED_WORD = /\p{Lu}\p{Ll}+/u; // e.g. Apple
const ACRONYM = /\p{Lu}+(?=(\p{Lu}\p{Ll})|\P{L}|\b)/u; // e.g. ID, URL, HTMLElement
const LOWERCASED_WORD = /(\p{Ll}+)/u; // e.g. apple
const ANY_LETTERS = /\p{L}+/u; // scripts without upper/lower case
const DIGITS = /\p{N}+/u; // e.g. 123

const WORD_OR_NUMBER = new RegExp(
    `${CAPITALIZED_WORD.source}|${ACRONYM.source}|${LOWERCASED_WORD.source}|${ANY_LETTERS.source}|${DIGITS.source}`,
    'gu',
);

/**
 * Converts a string into snake_case, e.g. `UserAccount` -> `user_account`.
 *
 * @param input - The string to convert
 *
 * @returns The snake_cased string
 */
export const toSnakeCase = (input: string): string => {
    return Array.from(input.matchAll(WORD_OR_NUMBER), (match) =>
        match[0].toLowerCase(),
    ).join('_');
};
