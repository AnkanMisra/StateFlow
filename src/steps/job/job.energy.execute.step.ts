/**
 * Background Job Step: Energy Execution
 * 
 * Name: job.energy.execute
 * Type: Background Job Step (Motia infrastructure-backed execution)
 * Trigger: execution.requested
 * 
 * Responsibility:
 * - Execute optimization actions asynchronously
 * - Write execution results to state
 * - Uses Motia's built-in retry/durability (no custom retry logic)
 */

import type { EventConfig, Handlers } from 'motia';
import {
    TOPICS,
    FLOWS,
    STATE_KEYS,
    type ExecutionRequest,
    type OptimizationResult,
} from '../../constants';

export const config: EventConfig = {
    name: 'job.energy.execute',
    type: 'event',
    description: 'Executes optimization actions with Motia infrastructure-backed durability',
    subscribes: [TOPICS.EXECUTION_REQUESTED],
    emits: [],
    flows: [FLOWS.ENERGY_OPTIMIZATION],
    input: {
        type: 'object',
        properties: {
            optimizationId: { type: 'string' },
            decision: {
                type: 'object',
                properties: {
                    action: { type: 'string' },
                    targetWindow: { type: 'string' },
                    expectedSavingsPercent: { type: 'number' },
                    confidence: { type: 'number' },
                    reasoning: { type: 'string' },
                },
            },
            triggeredAt: { type: 'string' },
        },
        required: ['optimizationId', 'decision', 'triggeredAt'],
    },
    infrastructure: {
        handler: { timeout: 30 },
        queue: { maxRetries: 3, visibilityTimeout: 60 },
    },
};

export const handler: Handlers['job.energy.execute'] = async (input, { logger, state }) => {
    const { optimizationId, decision, triggeredAt } = input as ExecutionRequest;

    logger.info('job.energy.execute: EXECUTION STARTED', {
        optimizationId,
        action: decision.action,
        targetWindow: decision.targetWindow,
    });

    try {
        // Execute the optimization action
        // In production, this would integrate with actual energy management systems
        const executionResult: OptimizationResult = await executeOptimization(decision, logger);

        // Write execution result to state
        await state.set('optimizations', `${optimizationId}/executionResult`, executionResult);

        logger.info('job.energy.execute: EXECUTION COMPLETED', {
            optimizationId,
            success: executionResult.success,
            appliedAt: executionResult.appliedAt,
        });

    } catch (error) {
        // Write failure result to state
        const failureResult: OptimizationResult = {
            success: false,
            appliedAt: new Date().toISOString(),
            details: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };

        await state.set('optimizations', `${optimizationId}/executionResult`, failureResult);

        logger.error('job.energy.execute: EXECUTION FAILED', {
            optimizationId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Re-throw to trigger Motia's retry mechanism
        throw error;
    }
};

/**
 * Execute the optimization action
 * In production, this would call actual energy management APIs
 */
async function executeOptimization(
    decision: ExecutionRequest['decision'],
    logger: { info: (msg: string, data?: unknown) => void }
): Promise<OptimizationResult> {
    const { action, targetWindow, expectedSavingsPercent } = decision;

    logger.info('job.energy.execute: Applying optimization', {
        action,
        targetWindow,
        expectedSavingsPercent,
    });

    // Simulate execution time (would be real API calls in production)
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, this would return actual results from energy management system
    return {
        success: true,
        appliedAt: new Date().toISOString(),
        details: `Applied ${action} optimization for window ${targetWindow}, expected savings: ${expectedSavingsPercent}%`,
    };
}
