import type { LogoutCommand } from '../../core/commands/logout.command.ts';

/**
 * Mocked logout: there is no persisted Session to end, so the command is a
 * no-op. A real handler appends logged-out for the Session unless it
 * already ended (`ended-session-is-a-no-op`).
 */
export const logoutHandler = async (_command: LogoutCommand): Promise<void> => {
    return;
};
