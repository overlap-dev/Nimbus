/**
 * The Users this example knows. Stands in for the User store and the
 * credential check a real IAM context owns — the example mocks IAM so it
 * can focus on the ticketing context.
 */
export type DemoUser = {
    userId: string;
    email: string;
    name: string;
};

export const DEMO_USERS: readonly DemoUser[] = [
    {
        userId: '11111111-1111-4111-8111-111111111111',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
    },
    {
        userId: '22222222-2222-4222-8222-222222222222',
        email: 'grace@example.com',
        name: 'Grace Hopper',
    },
    {
        userId: '33333333-3333-4333-8333-333333333333',
        email: 'linus@example.com',
        name: 'Linus Torvalds',
    },
];

export const findDemoUserByEmail = (email: string): DemoUser | null => {
    const normalized = email.trim().toLowerCase();

    return (
        DEMO_USERS.find((user) => {
            return user.email === normalized;
        }) ?? null
    );
};

export const findDemoUserById = (userId: string): DemoUser | null => {
    return (
        DEMO_USERS.find((user) => {
            return user.userId === userId;
        }) ?? null
    );
};
