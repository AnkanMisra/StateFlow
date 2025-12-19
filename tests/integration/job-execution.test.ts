/**
 * Integration Tests: Job Energy Execute
 * 
 * Tests the job.energy.execute Step which:
 * - Executes optimization actions asynchronously
 * - Writes execution results to state
 * - Uses Motia's infrastructure-backed durability
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/steps/job/job.energy.execute.step';
import { createMockContext, hasLogMessage } from '../helpers/mock-context';

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

    describe('Execution Success', () => {
        it('should write execution result to state', async () => {
            const input = createInput({ optimizationId: 'opt-exec-state' });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const result = await ctx.state.get<any>('optimizations', 'opt-exec-state/executionResult');
            expect(result).not.toBeNull();
            expect(result.success).toBe(true);
            expect(result.appliedAt).toBeDefined();
            expect(result.details).toContain('SHIFT_LOAD');
        });

        it('should log execution started', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(hasLogMessage(ctx.logger, 'EXECUTION STARTED')).toBe(true);
        });

        it('should log execution completed', async () => {
            const input = createInput();

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            expect(hasLogMessage(ctx.logger, 'EXECUTION COMPLETED')).toBe(true);
        });
    });

    describe('Execution Result Details', () => {
        it('should include action in result details', async () => {
            const input = createInput({
                optimizationId: 'opt-action-test',
                decision: {
                    action: 'REDUCE_CONSUMPTION',
                    targetWindow: '18:00-22:00',
                    expectedSavingsPercent: 12,
                    confidence: 0.78,
                },
            });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const result = await ctx.state.get<any>('optimizations', 'opt-action-test/executionResult');
            expect(result.details).toContain('REDUCE_CONSUMPTION');
            expect(result.details).toContain('18:00-22:00');
            expect(result.details).toContain('12%');
        });

        it('should have valid appliedAt timestamp', async () => {
            const input = createInput({ optimizationId: 'opt-timestamp' });

            await handler(input, {
                logger: ctx.logger,
                state: ctx.state,
            } as any);

            const result = await ctx.state.get<any>('optimizations', 'opt-timestamp/executionResult');
            const date = new Date(result.appliedAt);
            expect(date.getTime()).toBeGreaterThan(0);
        });
    });

    describe('State Isolation', () => {
        it('should not interfere with other optimizations', async () => {
            const input1 = createInput({ optimizationId: 'opt-job-1' });
            const input2 = createInput({ optimizationId: 'opt-job-2' });

            await handler(input1, { logger: ctx.logger, state: ctx.state } as any);
            await handler(input2, { logger: ctx.logger, state: ctx.state } as any);

            const result1 = await ctx.state.get<any>('optimizations', 'opt-job-1/executionResult');
            const result2 = await ctx.state.get<any>('optimizations', 'opt-job-2/executionResult');

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
        });
    });
});
