import { ZodType, z } from 'zod';

export const AuthContext = <TPolicy extends ZodType>(policyType: TPolicy) => {
    return z.object({
        sub: z.string(),
        groups: z.array(z.string()),
        policy: policyType.optional(),
    });
};

type AuthContextType<TPolicy extends ZodType> = ReturnType<
    typeof AuthContext<TPolicy>
>;

export type AuthContext<TPolicy> = z.infer<AuthContextType<ZodType<TPolicy>>>;
