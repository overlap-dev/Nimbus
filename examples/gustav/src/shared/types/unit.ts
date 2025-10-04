export const Units = [
    'piece',
    'gram',
    'milliliter',
] as const;

export type Unit = typeof Units[number];
