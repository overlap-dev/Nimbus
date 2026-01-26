import { GetUserGroupsQuery } from '../../../core/queries/getUserGroups.ts';
import { userRepository } from '../../mongodb/user.repository.ts';

export const getUserGroupsQueryHandler = async (query: GetUserGroupsQuery) => {
    const result = await userRepository.getUserGroups();

    return result;
};
