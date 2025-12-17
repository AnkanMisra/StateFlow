/**
 * Integration Tests: Workflow Energy Optimize
 * 
 * Tests the workflow.energy.optimize Step which:
 * - Orchestrates the optimization lifecycle
 * - Transitions through all states: RECEIVED → ANALYZING → DECIDED → EXECUTING → COMPLETED
 * - Owns and updates optimizations/{id} exclusively
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/steps/workflow/workflow.energy.optimize.step';
import { createMockContext, hasLogMessage } from '../helpers/mock-context';
import { OPTIMIZATION_STATUS } from '../../src/constants';

describe('workflow.energy.optimize', () => {
    let ctx: ReturnType<typeof createMockContext>;

    beforeEach(() => {
        ctx = createMockContext();
    });

    const createInput = (overrides: Partial<{
        optimizationId: string;
        date: string;
        totalConsumption: number;
        threshold: number;
        excessAmount: number;
        triggeredAt: string;
    }> = {}) => ({
        optimizationId: 'opt-2025-12-17-123456',
        date: '2025-12-17',
        totalConsumption: 150,
        threshold: 100,
        excessAmount: 50,
        triggeredAt: new Date().toISOString(),
        ...overrides,
    });

    describe('Lifecycle State Transitions', () => {
        it('should write RECEIVED state on workflow start', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            // Check that state transitions were logged
            expect(hasLogMessage(ctx.logger, 'STATE TRANSITION → RECEIVED')).toBe(true);
        });

        it('should transition through all states in order', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const logs = ctx.logger.logs.map(l => l.message);

            // Verify order of transitions
            const receivedIdx = logs.findIndex(m => m.includes('STATE TRANSITION → RECEIVED'));
            const analyzingIdx = logs.findIndex(m => m.includes('STATE TRANSITION → ANALYZING'));
            const decidedIdx = logs.findIndex(m => m.includes('STATE TRANSITION → DECIDED'));
            const executingIdx = logs.findIndex(m => m.includes('STATE TRANSITION → EXECUTING'));
            const completedIdx = logs.findIndex(m => m.includes('STATE TRANSITION → COMPLETED'));

            expect(receivedIdx).toBeGreaterThanOrEqual(0);
            expect(analyzingIdx).toBeGreaterThan(receivedIdx);
            expect(decidedIdx).toBeGreaterThan(analyzingIdx);
            expect(executingIdx).toBeGreaterThan(decidedIdx);
            expect(completedIdx).toBeGreaterThan(executingIdx);
        });

        it('should reach COMPLETED terminal state', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const finalState = await ctx.state.get<any>('optimizations', input.optimizationId);
            expect(finalState.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            expect(hasLogMessage(ctx.logger, 'WORKFLOW COMPLETE')).toBe(true);
        });
    });

    describe('State Persistence', () => {
        it('should write optimization state after each transition', async () => {
            const input = createInput({ optimizationId: 'opt-state-test' });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-state-test');
            expect(state).not.toBeNull();
            expect(state.id).toBe('opt-state-test');
            expect(state.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            expect(state.triggeredAt).toBeDefined();
            expect(state.completedAt).toBeDefined();
        });

        it('should contain decision when in DECIDED or later state', async () => {
            const input = createInput({ optimizationId: 'opt-decision-test' });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-decision-test');
            expect(state.decision).toBeDefined();
            expect(state.decision.action).toBeDefined();
            expect(state.decision.targetWindow).toBeDefined();
            expect(state.decision.expectedSavingsPercent).toBeGreaterThan(0);
            expect(state.decision.confidence).toBeGreaterThan(0);
        });

        it('should contain executionResult when COMPLETED', async () => {
            const input = createInput({ optimizationId: 'opt-result-test' });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-result-test');
            expect(state.executionResult).toBeDefined();
            expect(state.executionResult.success).toBe(true);
            expect(state.executionResult.appliedAt).toBeDefined();
            expect(state.executionResult.details).toContain('Successfully applied');
        });
    });

    describe('Deterministic Analysis', () => {
        it('should recommend SHIFT_LOAD for high excess (>20%)', async () => {
            // 80% excess (80/100)
            const input = createInput({
                optimizationId: 'opt-high-excess',
                totalConsumption: 180,
                threshold: 100,
                excessAmount: 80,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-high-excess');
            expect(state.decision.action).toBe('SHIFT_LOAD');
        });

        it('should recommend REDUCE_CONSUMPTION for moderate excess (10-20%)', async () => {
            // 15% excess (15/100)
            const input = createInput({
                optimizationId: 'opt-moderate-excess',
                totalConsumption: 115,
                threshold: 100,
                excessAmount: 15,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-moderate-excess');
            expect(state.decision.action).toBe('REDUCE_CONSUMPTION');
        });

        it('should recommend OPTIMIZE_SCHEDULING for minor excess (<10%)', async () => {
            // 5% excess (5/100)
            const input = createInput({
                optimizationId: 'opt-minor-excess',
                totalConsumption: 105,
                threshold: 100,
                excessAmount: 5,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-minor-excess');
            expect(state.decision.action).toBe('OPTIMIZE_SCHEDULING');
        });
    });

    describe('Logging and Observability', () => {
        it('should log WORKFLOW STARTED with input details', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(hasLogMessage(ctx.logger, 'WORKFLOW STARTED')).toBe(true);
        });

        it('should log analysis results', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(hasLogMessage(ctx.logger, 'Analysis complete')).toBe(true);
        });

        it('should log final duration', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const completeLog = ctx.logger.logs.find(l => l.message.includes('WORKFLOW COMPLETE'));
            expect(completeLog).toBeDefined();
            expect((completeLog?.data as any)?.duration).toMatch(/\d+ms/);
        });
    });

    describe('Edge Cases: Extreme Excess Percentages', () => {
        it('should handle 100%+ excess gracefully', async () => {
            // 200% excess (200/100)
            const input = createInput({
                optimizationId: 'opt-extreme',
                totalConsumption: 300,
                threshold: 100,
                excessAmount: 200,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-extreme');
            expect(state.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            expect(state.decision.action).toBe('SHIFT_LOAD');
            // Expected savings should be capped at 25
            expect(state.decision.expectedSavingsPercent).toBeLessThanOrEqual(25);
        });

        it('should handle near-zero excess (1%)', async () => {
            // 1% excess (1/100)
            const input = createInput({
                optimizationId: 'opt-tiny',
                totalConsumption: 101,
                threshold: 100,
                excessAmount: 1,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-tiny');
            expect(state.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            expect(state.decision.action).toBe('OPTIMIZE_SCHEDULING');
            expect(state.decision.expectedSavingsPercent).toBeLessThanOrEqual(10);
        });
    });

    describe('Edge Cases: Input Validation', () => {
        it('should handle floating point threshold values', async () => {
            const input = createInput({
                optimizationId: 'opt-float',
                totalConsumption: 100.5,
                threshold: 100.25,
                excessAmount: 0.25,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-float');
            expect(state.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
        });

        it('should handle very small threshold values', async () => {
            const input = createInput({
                optimizationId: 'opt-small-threshold',
                totalConsumption: 1,
                threshold: 0.5,
                excessAmount: 0.5,
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<any>('optimizations', 'opt-small-threshold');
            expect(state.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            // 0.5/0.5 = 100% excess -> SHIFT_LOAD
            expect(state.decision.action).toBe('SHIFT_LOAD');
        });
    });

    describe('State Isolation', () => {
        it('should not interfere with other optimization IDs', async () => {
            const input1 = createInput({ optimizationId: 'opt-isolation-1' });
            const input2 = createInput({ optimizationId: 'opt-isolation-2' });

            await handler(input1, { logger: ctx.logger, state: ctx.state } as any);
            await handler(input2, { logger: ctx.logger, state: ctx.state } as any);

            const state1 = await ctx.state.get<any>('optimizations', 'opt-isolation-1');
            const state2 = await ctx.state.get<any>('optimizations', 'opt-isolation-2');

            expect(state1.id).toBe('opt-isolation-1');
            expect(state2.id).toBe('opt-isolation-2');
            expect(state1.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            expect(state2.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
        });
    });
});
