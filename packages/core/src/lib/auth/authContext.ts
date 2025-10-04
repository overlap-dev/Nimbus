/**
 * Authentication context that can be passed through the application.
 */
export type AuthContext = {
    sub: string;
    groups: string[];
};
