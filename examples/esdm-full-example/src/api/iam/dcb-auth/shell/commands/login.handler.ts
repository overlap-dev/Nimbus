import { newUuidV4 } from '../../../../shared/lib/crypto/uuid.ts';
import { type LoginCommand, login } from '../../core/commands/login.command.ts';
import type { SessionState } from '../../core/domain/session.state.ts';
import { findDemoUserByEmail } from '../demo-users.ts';

/**
 * Mocked login: matches the email against the demo Users and ignores the
 * password. A real handler verifies the password hash, appends logged-in
 * under the DCB's append condition and persists the Session so the
 * authentication middleware can look it up.
 */
export const loginHandler = async (
    command: LoginCommand,
): Promise<SessionState> => {
    const user = findDemoUserByEmail(command.data.email);

    return login(user?.userId ?? null, newUuidV4(), new Date());
};
