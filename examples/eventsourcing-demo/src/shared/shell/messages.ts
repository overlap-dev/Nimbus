import { registerViews } from '../../read/shell/registerViews.ts';
import { registerUserMessages } from '../../write/iam/users/shell/registerUserMessages.ts';

export const initMessages = () => {
    registerViews();
    registerUserMessages();
};
