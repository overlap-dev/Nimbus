import { startSettledArchiveWatch } from './ticketing/pm-settled-archive/shell/events/settled-archive.handler.ts';

export const initProcessManagers = (): void => {
    startSettledArchiveWatch();
};
