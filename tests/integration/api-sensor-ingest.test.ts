/**
 * Integration Tests: API Sensor Ingest
 * 
 * Tests the api.sensor.ingest Step which:
 * - Validates incoming sensor payloads
 * - Writes to sensors/{sensorId} and usage/raw/{timestamp}
 * - Emits sensor.reading.created event
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/steps/api/api.sensor.ingest.step';
import { createMockContext, hasLogMessage } from '../helpers/mock-context';
import { TOPICS } from '../../src/constants';

describe('api.sensor.ingest', () => {
    let ctx: ReturnType<typeof createMockContext>;

    beforeEach(() => {
        ctx = createMockContext();
    });

    const createRequest = (body: unknown) => ({
        body,
        headers: {},
        query: {},
        params: {},
    });

    describe('Input Validation', () => {
        it('should return 400 when sensorId is missing', async () => {
            const req = createRequest({ value: 50, unit: 'kWh', type: 'energy' });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(400);
            expect(result.body.success).toBe(false);
            expect(result.body.error).toContain('sensorId');
        });

        it('should return 400 when sensorId is not a string', async () => {
            const req = createRequest({ sensorId: 123, value: 50 });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(400);
            expect(result.body.success).toBe(false);
        });

        it('should return 400 when value is missing', async () => {
            const req = createRequest({ sensorId: 'test-sensor' });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(400);
            expect(result.body.success).toBe(false);
            expect(result.body.error).toContain('value');
        });

        it('should return 400 when value is negative', async () => {
            const req = createRequest({ sensorId: 'test-sensor', value: -10 });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(400);
            expect(result.body.success).toBe(false);
            expect(result.body.error).toContain('non-negative');
        });

        it('should accept value of zero', async () => {
            const req = createRequest({ sensorId: 'test-sensor', value: 0 });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(201);
            expect(result.body.success).toBe(true);
        });

        it('should accept very large values', async () => {
            const req = createRequest({ sensorId: 'test-sensor', value: 999999999 });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(201);
            expect(result.body.success).toBe(true);
        });
    });

    describe('Default Values', () => {
        it('should default unit to kWh when not provided', async () => {
            const req = createRequest({ sensorId: 'test-sensor', value: 50 });

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const sensorState = await ctx.state.get<any>('sensors', 'test-sensor');
            expect(sensorState.latestReading.unit).toBe('kWh');
        });

        it('should default type to energy when not provided', async () => {
            const req = createRequest({ sensorId: 'test-sensor', value: 50 });

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const sensorState = await ctx.state.get<any>('sensors', 'test-sensor');
            expect(sensorState.latestReading.type).toBe('energy');
        });
    });

    describe('State Persistence', () => {
        it('should write to sensors/{sensorId} state', async () => {
            const req = createRequest({ sensorId: 'sensor-state-test', value: 75 });

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const sensorState = await ctx.state.get<any>('sensors', 'sensor-state-test');
            expect(sensorState).not.toBeNull();
            expect(sensorState.latestReading.sensorId).toBe('sensor-state-test');
            expect(sensorState.latestReading.value).toBe(75);
            expect(sensorState.lastUpdated).toBeDefined();
        });

        it('should write to usage/raw/{timestamp} state', async () => {
            const req = createRequest({ sensorId: 'test-sensor', value: 50 });

            // Clear previous calls to check new ones
            ctx.reset();

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            // Check that raw usage was written (key format: usage/raw/{timestamp})
            const entries = Array.from(ctx.state.data.entries());
            const rawUsageEntry = entries.find(([key]) => key.startsWith('usage/raw/'));
            expect(rawUsageEntry).toBeDefined();
        });

        it('should update sensor state on subsequent readings', async () => {
            const req1 = createRequest({ sensorId: 'update-test', value: 50 });
            const req2 = createRequest({ sensorId: 'update-test', value: 100 });

            await handler(req1 as any, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            const firstState = await ctx.state.get<any>('sensors', 'update-test');
            expect(firstState.latestReading.value).toBe(50);

            await handler(req2 as any, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            const secondState = await ctx.state.get<any>('sensors', 'update-test');
            expect(secondState.latestReading.value).toBe(100);
        });
    });

    describe('Event Emission', () => {
        it('should emit sensor.reading.created event', async () => {
            const req = createRequest({ sensorId: 'emit-test', value: 50 });

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(ctx.emitCalls.length).toBe(1);
            expect(ctx.emitCalls[0].topic).toBe(TOPICS.SENSOR_READING_CREATED);
        });

        it('should include date in emitted event for aggregation', async () => {
            const req = createRequest({ sensorId: 'date-test', value: 50 });

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const emittedData = ctx.emitCalls[0].data as any;
            expect(emittedData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        });

        it('should include all sensor reading fields in emitted event', async () => {
            const req = createRequest({
                sensorId: 'full-test',
                value: 75,
                unit: 'Wh',
                type: 'temperature'
            });

            await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const emittedData = ctx.emitCalls[0].data as any;
            expect(emittedData.sensorId).toBe('full-test');
            expect(emittedData.value).toBe(75);
            expect(emittedData.unit).toBe('Wh');
            expect(emittedData.type).toBe('temperature');
            expect(emittedData.timestamp).toBeDefined();
        });
    });

    describe('Response Structure', () => {
        it('should return 201 with success message on valid input', async () => {
            const req = createRequest({ sensorId: 'response-test', value: 50 });

            const result = await handler(req as any, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(result.status).toBe(201);
            expect(result.body.success).toBe(true);
            expect(result.body.message).toContain('successfully');
            expect(result.body.sensorId).toBe('response-test');
            expect(result.body.timestamp).toBeDefined();
            expect(result.body.eventEmitted).toBe(TOPICS.SENSOR_READING_CREATED);
        });
    });
});
