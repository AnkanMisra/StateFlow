/**
 * Integration Tests: Job Energy Execute
 * 
 * Tests the job.energy.execute Step which:
 * - Executes optimization actions asynchronously
 * - Updates parent optimization state to COMPLETED/FAILED
 * - Uses Motia's infrastructure-backed durability
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/steps/job/job.energy.execute.step';
import { createMockContext, hasLogMessage } from '../helpers/mock-context';
import { OPTIMIZATION_STATUS, type OptimizationState } from '../../src/constants';

describe('job.energy.execute', () => {
    let ctx: ReturnType<typeof createMockContext>;

    beforeEach(() => {
        ctx = createMockContext();
    });

    const createInput = (overrides: Partial<{
        optimizationId: string;
        decision: {
            action: string;
            targetWindow: string;
            expectedSavingsPercent: number;
            confidence: number;
            reasoning?: string;
        };
        triggeredAt: string;
    }> = {}) => ({
        optimizationId: 'opt-job-test-123',
        decision: {
            action: 'SHIFT_LOAD',
            targetWindow: '02:00-05:00',
            expectedSavingsPercent: 15,
            confidence: 0.85,
            reasoning: 'Test decision',
        },
        triggeredAt: new Date().toISOString(),
        ...overrides,
    });

    // Pre-seed optimization state as if workflow has run
    const seedOptimizationState = async (optimizationId: string) => {
        const state: OptimizationState = {
            id: optimizationId,
            status: OPTIMIZATION_STATUS.EXECUTING,
            triggeredAt: new Date().toISOString(),
            decision: {
                action: 'SHIFT_LOAD',
                targetWindow: '02:00-05:00',
                expectedSavingsPercent: 15,
                confidence: 0.85,
            },
        };
        await ctx.state.set('optimizations', optimizationId, state);
    };

    describe('Terminal State Updates', () => {
        it('should update optimization status to COMPLETED', async () => {
            const optimizationId = 'opt-terminal-test';
            await seedOptimizationState(optimizationId);
            const input = createInput({ optimizationId });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<OptimizationState>('optimizations', optimizationId);
            expect(state?.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
        });

        it('should set completedAt timestamp', async () => {
            const optimizationId = 'opt-completed-at';
            await seedOptimizationState(optimizationId);
            const input = createInput({ optimizationId });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<OptimizationState>('optimizations', optimizationId);
            expect(state?.completedAt).toBeDefined();
            const date = new Date(state!.completedAt!);
            expect(date.getTime()).toBeGreaterThan(0);
        });

        it('should include executionResult in parent state', async () => {
            const optimizationId = 'opt-exec-result';
            await seedOptimizationState(optimizationId);
            const input = createInput({ optimizationId });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const state = await ctx.state.get<OptimizationState>('optimizations', optimizationId);
            expect(state?.executionResult).toBeDefined();
            expect(state?.executionResult?.success).toBe(true);
            expect(state?.executionResult?.details).toContain('SHIFT_LOAD');
        });
    });

    describe('Logging', () => {
        it('should log execution started', async () => {
            const optimizationId = 'opt-log-start';
            await seedOptimizationState(optimizationId);
            const input = createInput({ optimizationId });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(hasLogMessage(ctx.logger, 'EXECUTION STARTED')).toBe(true);
        });

        it('should log state transition to COMPLETED', async () => {
            const optimizationId = 'opt-log-complete';
            await seedOptimizationState(optimizationId);
            const input = createInput({ optimizationId });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(hasLogMessage(ctx.logger, 'STATE TRANSITION -> COMPLETED')).toBe(true);
        });
    });

    describe('State Isolation', () => {
        it('should not interfere with other optimizations', async () => {
            await seedOptimizationState('opt-job-1');
            await seedOptimizationState('opt-job-2');

            await handler(createInput({ optimizationId: 'opt-job-1' }), { logger: ctx.logger, state: ctx.state } as any);
            await handler(createInput({ optimizationId: 'opt-job-2' }), { logger: ctx.logger, state: ctx.state } as any);

            const state1 = await ctx.state.get<OptimizationState>('optimizations', 'opt-job-1');
            const state2 = await ctx.state.get<OptimizationState>('optimizations', 'opt-job-2');

            expect(state1?.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
            expect(state2?.status).toBe(OPTIMIZATION_STATUS.COMPLETED);
        });
    });
});
