export const isWriteConflict = (error: unknown): boolean => {
    return (
        typeof error === 'object' &&
        error != null &&
        'message' in error &&
        typeof error.message === 'string' &&
        (error as { message: string }).message.includes(
            "got HTTP status code '409'",
        )
    );
};
