import { GenericException, getLogger } from '@nimbus/core';
import type {
    EventStoreObserveConfig,
    EventStoreSubscription,
    EventStoreSubscriptionStatus,
    EventWithMetadata,
} from '@nimbus/eventsourcing';
import type { EventSourcingDbEvent } from './eventSourcingDb.ts';

/**
 * Subscription implementation for EventSourcingDB.
 * Manages the streaming connection and processes incoming events.
 */
export class EventSourcingDBSubscription implements EventStoreSubscription {
    private _status: EventStoreSubscriptionStatus = 'active';
    private _lastEventId?: string;
    private _abortController?: AbortController;
    private readonly _apiUrl: string;
    private readonly _secret: string;
    private readonly _config: EventStoreObserveConfig;
    private readonly _mapper: (
        dbEvent: EventSourcingDbEvent,
    ) => EventWithMetadata;

    constructor(
        apiUrl: string,
        secret: string,
        config: EventStoreObserveConfig,
        mapper: (dbEvent: EventSourcingDbEvent) => EventWithMetadata,
    ) {
        this._apiUrl = apiUrl;
        this._secret = secret;
        this._config = config;
        this._mapper = mapper;
        this._lastEventId = config.sinceEventId;
    }

    start(): Promise<void> {
        this._abortController = new AbortController();
        this._status = 'active';

        // Start streaming in background
        this._stream().catch((error) => {
            this._status = 'error';
            if (this._config.onError) {
                this._config.onError(error);
            } else {
                getLogger().error({
                    category: 'Nimbus',
                    message: 'EventSourcingDB observation stream error',
                    error,
                });
            }
        });

        return Promise.resolve();
    }

    unsubscribe(): Promise<void> {
        if (this._abortController) {
            this._abortController.abort();
        }
        this._status = 'closed';

        getLogger().debug({
            category: 'Nimbus',
            message: 'EventSourcingDB subscription closed',
            data: {
                subject: this._config.subject,
                lastEventId: this._lastEventId,
            },
        });

        return Promise.resolve();
    }

    getStatus(): EventStoreSubscriptionStatus {
        return this._status;
    }

    getLastEventId(): string | undefined {
        return this._lastEventId;
    }

    private async _stream(): Promise<void> {
        const body = JSON.stringify({
            subject: this._config.subject,
            options: {
                recursive: this._config.recursive ?? false,
                ...(this._lastEventId && {
                    lowerBound: {
                        id: parseInt(this._lastEventId, 10),
                        type: 'exclusive',
                    },
                }),
            },
        });

        const response = await fetch(`${this._apiUrl}/observe-events`, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${this._secret}`,
                'content-type': 'application/json',
            },
            body,
            signal: this._abortController?.signal,
        });

        if (!response.ok) {
            throw new GenericException('Failed to start observing events', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
            });
        }

        if (!response.body) {
            throw new GenericException('Response body is null');
        }

        getLogger().info({
            category: 'Nimbus',
            message: 'EventSourcingDB observation started',
            data: {
                subject: this._config.subject,
                recursive: this._config.recursive,
                sinceEventId: this._lastEventId,
            },
        });

        // Process NDJSON stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    try {
                        const item = JSON.parse(line);

                        // Skip heartbeat messages
                        if (item.type === 'heartbeat') {
                            continue;
                        }

                        const dbEvent = item.payload as EventSourcingDbEvent;
                        const nimbusEvent = this._mapper(dbEvent);

                        this._lastEventId = nimbusEvent.eventstoremetadata.id;

                        await this._config.handler(nimbusEvent);
                    } catch (error: any) {
                        if (this._config.onError) {
                            this._config.onError(error);
                        } else {
                            throw error;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
