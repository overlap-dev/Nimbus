import { ObjectId } from 'mongodb';
import { GetUserQuery } from '../../../core/queries/getUser.query.ts';
import { userRepository } from '../../mongodb/user.repository.ts';

export const getUserQueryHandler = async (query: GetUserQuery) => {
    const state = await userRepository.findOne({
        filter: { _id: new ObjectId(query.data.id) },
    });

    return state;
};
