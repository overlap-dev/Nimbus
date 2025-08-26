import { CloudEvent } from '@nimbus/core';

export interface RecipeEventOutputPort {
    putEvent: <TEvent extends CloudEvent<string, any>>(event: TEvent) => void;
}
