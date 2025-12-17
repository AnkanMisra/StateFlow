/**
 * Event Step: Sensor Process (Placeholder for Phase 1)
 * 
 * Name: event.sensor.process
 * Type: Event Step
 * Trigger: sensor.reading.created
 * 
 * Responsibility (Phase 2):
 * - Aggregate usage
 * - Update daily usage
 * - Decide whether optimization is needed
 * 
 * This is a minimal placeholder to enable the emit type in Phase 1.
 * Full implementation will be added in Phase 2.
 */

import type { EventConfig, Handlers } from 'motia';
import { TOPICS, FLOWS } from '../../constants';

export const config: EventConfig = {
    name: 'event.sensor.process',
    type: 'event',
    description: 'Processes incoming sensor readings and aggregates usage data',
    subscribes: [TOPICS.SENSOR_READING_CREATED],
    emits: [TOPICS.OPTIMIZATION_REQUIRED],
    flows: [FLOWS.ENERGY_OPTIMIZATION],
    // Input schema defines the expected event data shape
    input: {
        type: 'object',
        properties: {
            sensorId: { type: 'string' },
            value: { type: 'number' },
            unit: { type: 'string' },
            type: { type: 'string' },
            timestamp: { type: 'string' },
            date: { type: 'string' },
        },
        required: ['sensorId', 'value', 'unit', 'type', 'timestamp', 'date'],
    },
};

export const handler: Handlers['event.sensor.process'] = async (input, { logger }) => {
    // Placeholder for Phase 1 - just log the event
    logger.info('SensorProcess received event', {
        sensorId: input.sensorId,
        value: input.value,
        date: input.date,
        timestamp: input.timestamp,
    });

    // Full implementation with aggregation and optimization trigger will be added in Phase 2
    logger.info('Event processing complete (Phase 1 placeholder)');
};
