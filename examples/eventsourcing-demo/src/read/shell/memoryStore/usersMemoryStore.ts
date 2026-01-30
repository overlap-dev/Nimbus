export type UsersRow = {
    id: string;
    revision: string;
    email: string;
    firstName: string;
    lastName: string;
    invitedAt: string;
};

export const usersMemoryStore = new Map<string, UsersRow>();

let usersMemoryStoreLastEventId: string | null = null;

export const setUsersMemoryStoreLastEventId = (lastEventId: string) => {
    usersMemoryStoreLastEventId = lastEventId;
};

export const getUsersMemoryStoreLastEventId = () => {
    return usersMemoryStoreLastEventId;
};
