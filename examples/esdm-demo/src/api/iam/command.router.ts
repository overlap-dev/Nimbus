import { registerAuthCommands } from './dcb-auth/shell/command.router.ts';

export const registerIamCommands = (): void => {
    registerAuthCommands();
};
