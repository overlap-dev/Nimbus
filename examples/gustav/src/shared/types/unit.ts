import { z } from 'zod';

export const Piece = z.object({
    name: z.literal('Piece'),
    short: z.literal('piece'),
});
export type Piece = z.infer<typeof Piece>;

export const TableSpoon = z.object({
    name: z.literal('Table Spoon'),
    short: z.literal('EL'),
});
export type TableSpoon = z.infer<typeof TableSpoon>;

export const Gram = z.object({
    name: z.literal('Gram'),
    short: z.literal('g'),
});
export type Gram = z.infer<typeof Gram>;

export const Liter = z.object({
    name: z.literal('Liter'),
    short: z.literal('l'),
});
export type Liter = z.infer<typeof Liter>;

export const Unit = z.discriminatedUnion('name', [
    Piece,
    TableSpoon,
    Gram,
    Liter,
]);
export type Unit = z.infer<typeof Unit>;
