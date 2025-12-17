/**
 * Integration Tests: Event Sensor Process
 * 
 * Tests the event.sensor.process Step which:
 * - Aggregates sensor readings into daily usage
 * - Compares against thresholds
 * - Emits optimization.required when exceeded
 * - Prevents duplicate emissions (idempotency)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/steps/event/event.sensor.process.step';
import { createMockContext, hasLogMessage, hasEmittedTopic, getEmittedByTopic } from '../helpers/mock-context';
import { TOPICS } from '../../src/constants';

describe('event.sensor.process', () => {
    let ctx: ReturnType<typeof createMockContext>;

    beforeEach(() => {
        ctx = createMockContext();
    });

    const createInput = (overrides: Partial<{
        sensorId: string;
        value: number;
        unit: string;
        type: string;
        timestamp: string;
        date: string;
    }> = {}) => ({
        sensorId: 'test-sensor',
        value: 50,
        unit: 'kWh',
        type: 'energy',
        timestamp: new Date().toISOString(),
        date: '2025-12-17',
        ...overrides,
    });

    describe('Daily Usage Aggregation', () => {
        it('should initialize daily usage on first reading', async () => {
            const input = createInput({ value: 30 });

            await handler(input, {
                emit: ctx.emit,
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const dailyUsage = await ctx.state.get<any>('usage', 'daily/2025-12-17');
            expect(dailyUsage).not.toBeNull();
            expect(dailyUsage.totalConsumption).toBe(30);
            expect(dailyUsage.readingCount).toBe(1);
            expect(dailyUsage.readings).toEqual([30]);
        });

        it('should aggregate multiple readings correctly', async () => {
            const input1 = createInput({ value: 20, date: '2025-12-18' });
            const input2 = createInput({ value: 30, date: '2025-12-18' });
            const input3 = createInput({ value: 50, date: '2025-12-18' });

            // Set high threshold to avoid triggering optimization
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 1000, peakHourLimit: 500 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            await handler(input1, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            await handler(input2, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            await handler(input3, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            const dailyUsage = await ctx.state.get<any>('usage', 'daily/2025-12-18');
            expect(dailyUsage.totalConsumption).toBe(100); // 20 + 30 + 50
            expect(dailyUsage.readingCount).toBe(3);
            expect(dailyUsage.peakUsage).toBe(50);
            expect(dailyUsage.avgUsage).toBeCloseTo(33.33, 1);
        });
    });

    describe('Threshold Checking', () => {
        it('should NOT emit optimization.required when under threshold', async () => {
            // Set threshold higher than reading
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 100, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 30, date: '2025-12-19' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            expect(ctx.emitCalls.some(c => c.topic === TOPICS.OPTIMIZATION_REQUIRED)).toBe(false);
            expect(hasLogMessage(ctx.logger, 'No optimization needed')).toBe(true);
        });

        it('should emit optimization.required when threshold exceeded', async () => {
            // Set threshold lower than reading
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 20, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 50, date: '2025-12-20' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            expect(ctx.emitCalls.some(c => c.topic === TOPICS.OPTIMIZATION_REQUIRED)).toBe(true);
            expect(hasLogMessage(ctx.logger, 'EMITTED optimization.required')).toBe(true);
        });

        it('should use default threshold when no user preferences set', async () => {
            // No preferences set - default is 100 kWh
            const input = createInput({ value: 150, date: '2025-12-21' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // 150 > 100 (default), should trigger
            expect(ctx.emitCalls.some(c => c.topic === TOPICS.OPTIMIZATION_REQUIRED)).toBe(true);
        });
    });

    describe('Idempotency Guard', () => {
        it('should emit optimization.required only ONCE per day', async () => {
            // Set low threshold
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 10, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const date = '2025-12-22';

            // First reading - exceeds threshold, should trigger
            const input1 = createInput({ value: 20, date });
            await handler(input1, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            expect(ctx.emitCalls.length).toBe(1);
            expect(ctx.emitCalls[0].topic).toBe(TOPICS.OPTIMIZATION_REQUIRED);

            // Second reading - still exceeds, but should SKIP
            const input2 = createInput({ value: 30, date });
            await handler(input2, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // Still only 1 emission
            expect(ctx.emitCalls.length).toBe(1);
            expect(hasLogMessage(ctx.logger, 'Optimization already triggered for today, skipping duplicate')).toBe(true);

            // Third reading - still exceeds, still should SKIP
            const input3 = createInput({ value: 40, date });
            await handler(input3, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // Still only 1 emission
            expect(ctx.emitCalls.length).toBe(1);
        });

        it('should allow emissions on different days', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 10, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            // Day 1
            const input1 = createInput({ value: 20, date: '2025-12-23' });
            await handler(input1, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // Day 2
            const input2 = createInput({ value: 20, date: '2025-12-24' });
            await handler(input2, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // Should have 2 emissions (one per day)
            expect(ctx.emitCalls.length).toBe(2);
        });
    });

    describe('Emitted Event Structure', () => {
        it('should emit correct event payload', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 30, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 50, date: '2025-12-25' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            const emittedEvents = ctx.emitCalls.filter(c => c.topic === TOPICS.OPTIMIZATION_REQUIRED).map(c => c.data);
            expect(emittedEvents.length).toBe(1);

            const payload = emittedEvents[0] as any;
            expect(payload.date).toBe('2025-12-25');
            expect(payload.totalConsumption).toBe(50);
            expect(payload.threshold).toBe(30);
            expect(payload.excessAmount).toBe(20); // 50 - 30
            expect(payload.optimizationId).toMatch(/^opt-2025-12-25-\d+$/);
            expect(payload.triggeredAt).toBeDefined();
        });
    });

    describe('Edge Cases: Boundary Conditions', () => {
        it('should NOT trigger when consumption EQUALS threshold exactly', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 50, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 50, date: '2025-12-26' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // 50 is NOT > 50, so no trigger
            expect(ctx.emitCalls.length).toBe(0);
            expect(hasLogMessage(ctx.logger, 'No optimization needed')).toBe(true);
        });

        it('should trigger when consumption is just 0.01 over threshold', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 50, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 50.01, date: '2025-12-27' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            expect(ctx.emitCalls.length).toBe(1);
        });

        it('should handle zero value readings', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 100, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 0, date: '2025-12-28' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            const dailyUsage = await ctx.state.get<any>('usage', 'daily/2025-12-28');
            expect(dailyUsage.totalConsumption).toBe(0);
            expect(dailyUsage.readingCount).toBe(1);
            expect(ctx.emitCalls.length).toBe(0); // 0 < 100, no trigger
        });

        it('should handle very large consumption values', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 100, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const input = createInput({ value: 999999999, date: '2025-12-29' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            expect(ctx.emitCalls.length).toBe(1);
            const payload = ctx.emitCalls[0].data as any;
            expect(payload.totalConsumption).toBe(999999999);
            expect(payload.excessAmount).toBe(999999899); // 999999999 - 100
        });
    });

    describe('Edge Cases: Multiple Sensors', () => {
        it('should aggregate readings from different sensors on same day', async () => {
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 100, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            const date = '2025-12-30';

            // Different sensors, same day
            await handler(createInput({ sensorId: 'sensor-A', value: 30, date }),
                { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            await handler(createInput({ sensorId: 'sensor-B', value: 40, date }),
                { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            await handler(createInput({ sensorId: 'sensor-C', value: 50, date }),
                { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            const dailyUsage = await ctx.state.get<any>('usage', 'daily/2025-12-30');
            expect(dailyUsage.totalConsumption).toBe(120); // 30 + 40 + 50
            expect(dailyUsage.readingCount).toBe(3);

            // Should trigger at 120 > 100
            expect(ctx.emitCalls.length).toBe(1);
        });
    });

    describe('Edge Cases: Threshold Updates', () => {
        it('should use updated thresholds immediately', async () => {
            // Start with high threshold
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 1000, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            await handler(createInput({ value: 50, date: '2025-12-31' }),
                { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);
            expect(ctx.emitCalls.length).toBe(0); // 50 < 1000

            // Update threshold mid-stream
            await ctx.state.set('user', 'preferences', {
                thresholds: { dailyMax: 30, peakHourLimit: 50 },
                costSensitivity: 'medium',
                automationLevel: 'suggested',
            });

            await handler(createInput({ value: 10, date: '2025-12-31' }),
                { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // 50 + 10 = 60 > 30, should trigger
            expect(ctx.emitCalls.length).toBe(1);
        });
    });

    describe('Edge Cases: State Recovery', () => {
        it('should handle reading from empty state gracefully', async () => {
            // No prior state set - should not throw
            const input = createInput({ value: 50, date: '2026-01-01' });

            await expect(
                handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any)
            ).resolves.not.toThrow();

            const dailyUsage = await ctx.state.get<any>('usage', 'daily/2026-01-01');
            expect(dailyUsage).toBeDefined();
            expect(dailyUsage.totalConsumption).toBe(50);
        });

        it('should handle missing user preferences gracefully', async () => {
            // No preferences at all - uses defaults (100 kWh)
            const input = createInput({ value: 150, date: '2026-01-02' });
            await handler(input, { emit: ctx.emit, logger: ctx.logger, state: ctx.state } as any);

            // 150 > 100 (default), should trigger
            expect(ctx.emitCalls.length).toBe(1);
            // Verify it used defaults by checking thresholds source in log
            const thresholdLog = ctx.logger.logs.find(l =>
                l.message.includes('Retrieved thresholds') && (l.data as any)?.source
            );
            expect(thresholdLog).toBeDefined();
        });
    });
});
