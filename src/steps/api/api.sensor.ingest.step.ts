/**
 * API Step: Sensor Ingestion
 * 
 * Name: api.sensor.ingest
 * Type: API Step
 * Trigger: HTTP POST /api/sensor/ingest
 * 
 * Responsibility:
 * - Accept sensor readings from IoT devices
 * - Validate payload
 * - Write raw data to state
 * - Emit ingestion event for downstream processing
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import {
    STATE_KEYS,
    TOPICS,
    FLOWS,
    type SensorReading,
    type SensorState
} from '../../constants';

export const config: ApiRouteConfig = {
    name: 'api.sensor.ingest',
    type: 'api',
    path: '/api/sensor/ingest',
    method: 'POST',
    description: 'Accepts sensor readings, persists to state, and triggers processing pipeline',
    emits: [TOPICS.SENSOR_READING_CREATED],
    flows: [FLOWS.ENERGY_OPTIMIZATION],
};

export const handler: Handlers['api.sensor.ingest'] = async (req, { emit, logger, state }) => {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0]; // YYYY-MM-DD for daily aggregation

    logger.info('Sensor ingestion request received', { body: req.body });

    // Extract and validate body manually
    const body = req.body as {
        sensorId?: string;
        value?: number;
        unit?: string;
        type?: 'energy' | 'temperature' | 'humidity';
    };

    // Basic validation
    if (!body.sensorId || typeof body.sensorId !== 'string') {
        logger.error('Validation failed: sensorId is required');
        return {
            status: 400,
            body: { success: false, error: 'sensorId is required' },
        };
    }

    if (typeof body.value !== 'number' || body.value < 0) {
        logger.error('Validation failed: value must be a non-negative number');
        return {
            status: 400,
            body: { success: false, error: 'value must be a non-negative number' },
        };
    }

    const sensorId = body.sensorId;
    const value = body.value;
    const unit = body.unit || 'kWh';
    const type = body.type || 'energy';

    // Construct the sensor reading
    const sensorReading: SensorReading = {
        sensorId,
        value,
        unit,
        type,
        timestamp,
    };

    // Write to sensor state: sensors/{sensorId}
    const sensorState: SensorState = {
        latestReading: sensorReading,
        lastUpdated: timestamp,
    };

    await state.set('sensors', sensorId, sensorState);
    logger.info('Sensor state updated', { key: STATE_KEYS.sensor(sensorId), sensorState });

    // Write to raw usage: usage/raw/{timestamp}
    await state.set('usage', `raw/${timestamp}`, sensorReading);
    logger.info('Raw usage recorded', { key: STATE_KEYS.usageRaw(timestamp) });

    // Emit event for downstream processing
    await emit({
        topic: TOPICS.SENSOR_READING_CREATED,
        data: {
            ...sensorReading,
            date, // Include date for daily aggregation
        },
    });
    logger.info('Event emitted', { topic: TOPICS.SENSOR_READING_CREATED, sensorId });

    return {
        status: 201,
        body: {
            success: true,
            message: 'Sensor reading ingested successfully',
            sensorId,
            timestamp,
            eventEmitted: TOPICS.SENSOR_READING_CREATED,
        },
    };
};
