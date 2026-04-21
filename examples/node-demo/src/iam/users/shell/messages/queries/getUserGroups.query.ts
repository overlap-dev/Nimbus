import { userRepository } from '../../mongodb/user.repository.ts';

export const getUserGroupsQueryHandler = async () => {
    const result = await userRepository.getUserGroups();

    return result;
};
