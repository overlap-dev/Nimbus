/**
 * As try/catch types the error as `unknown`
 * this function converts it to an `Error`.
 */
export const toError = (error: unknown): Error => {
    return error instanceof Error ? error : new Error(String(error));
};
