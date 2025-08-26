import { CloudEvent } from '@nimbus/core';

export interface RecipeEventBus {
    putEvent: <TEvent extends CloudEvent<string, any>>(event: TEvent) => void;
}
