/**
 * CloudEvents `source` of every command, query and event this app emits.
 */
export const CLOUDEVENTS_SOURCE = 'https://nimbus.overlap.at/esdm-demo';

/**
 * Reverse-domain prefix of every message type:
 * `<namespace>.<bounded-context>.<consistency-unit>.<message>`.
 */
export const CLOUDEVENTS_NAMESPACE = 'at.overlap.nimbus.esdm-demo';
