/**
 * Workflow Step: Energy Optimization
 * 
 * Name: workflow.energy.optimize
 * Type: Event Step (acts as workflow orchestrator)
 * Trigger: optimization.required
 * 
 * Responsibility:
 * - Orchestrate the optimization lifecycle
 * - Own and update optimizations/{id} exclusively
 * - Write explicit lifecycle state transitions:
 *   RECEIVED → ANALYZING → DECIDED → EXECUTING → COMPLETED/FAILED
 * 
 * This is the EXCLUSIVE owner of optimization lifecycle state.
 * All transitions must be visible in Motia UI.
 */

import type { EventConfig, Handlers } from 'motia';
import {
    TOPICS,
    FLOWS,
    STATE_KEYS,
    OPTIMIZATION_STATUS,
    type OptimizationState,
    type OptimizationDecision,
} from '../../constants';

export const config: EventConfig = {
    name: 'workflow.energy.optimize',
    type: 'event',
    description: 'Orchestrates the energy optimization lifecycle with explicit state transitions',
    subscribes: [TOPICS.OPTIMIZATION_REQUIRED],
    emits: [], // No downstream events in Phase 2
    flows: [FLOWS.ENERGY_OPTIMIZATION],
    input: {
        type: 'object',
        properties: {
            optimizationId: { type: 'string' },
            date: { type: 'string' },
            totalConsumption: { type: 'number' },
            threshold: { type: 'number' },
            excessAmount: { type: 'number' },
            triggeredAt: { type: 'string' },
        },
        required: ['optimizationId', 'date', 'totalConsumption', 'threshold', 'excessAmount', 'triggeredAt'],
    },
};

export const handler: Handlers['workflow.energy.optimize'] = async (input, { logger, state }) => {
    const { optimizationId, date, totalConsumption, threshold, excessAmount, triggeredAt } = input;

    logger.info('workflow.energy.optimize: WORKFLOW STARTED', {
        optimizationId,
        date,
        totalConsumption,
        threshold,
        excessAmount,
    });

    // ========================================
    // STATE: RECEIVED
    // ========================================
    const optimizationState: OptimizationState = {
        id: optimizationId,
        status: OPTIMIZATION_STATUS.RECEIVED,
        triggeredAt,
    };

    await state.set('optimizations', optimizationId, optimizationState);
    logger.info('workflow.energy.optimize: STATE TRANSITION → RECEIVED', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.RECEIVED,
    });

    // ========================================
    // STATE: ANALYZING
    // ========================================
    optimizationState.status = OPTIMIZATION_STATUS.ANALYZING;
    await state.set('optimizations', optimizationId, optimizationState);
    logger.info('workflow.energy.optimize: STATE TRANSITION → ANALYZING', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.ANALYZING,
    });

    // Simulate analysis (in Phase 3, this will call AI)
    // For now, we make a deterministic decision based on excess amount
    const analysisResult = analyzeUsagePattern(totalConsumption, threshold, excessAmount);
    logger.info('workflow.energy.optimize: Analysis complete', {
        recommendation: analysisResult.action,
        expectedSavings: analysisResult.expectedSavingsPercent,
    });

    // ========================================
    // STATE: DECIDED
    // ========================================
    const decision: OptimizationDecision = {
        action: analysisResult.action,
        targetWindow: analysisResult.targetWindow,
        expectedSavingsPercent: analysisResult.expectedSavingsPercent,
        confidence: analysisResult.confidence,
        reasoning: analysisResult.reasoning,
    };

    optimizationState.status = OPTIMIZATION_STATUS.DECIDED;
    optimizationState.decision = decision;
    await state.set('optimizations', optimizationId, optimizationState);
    logger.info('workflow.energy.optimize: STATE TRANSITION → DECIDED', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.DECIDED,
        decision,
    });

    // ========================================
    // STATE: EXECUTING
    // ========================================
    optimizationState.status = OPTIMIZATION_STATUS.EXECUTING;
    await state.set('optimizations', optimizationId, optimizationState);
    logger.info('workflow.energy.optimize: STATE TRANSITION → EXECUTING', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.EXECUTING,
    });

    // Simulate execution (in Phase 4, this will trigger job.energy.execute)
    // For now, we simulate a successful execution
    const executionSuccess = simulateExecution(decision);

    // ========================================
    // STATE: COMPLETED or FAILED
    // ========================================
    if (executionSuccess) {
        optimizationState.status = OPTIMIZATION_STATUS.COMPLETED;
        optimizationState.completedAt = new Date().toISOString();
        optimizationState.executionResult = {
            success: true,
            appliedAt: new Date().toISOString(),
            details: `Successfully applied ${decision.action} optimization`,
        };

        await state.set('optimizations', optimizationId, optimizationState);
        logger.info('workflow.energy.optimize: STATE TRANSITION → COMPLETED', {
            key: STATE_KEYS.optimization(optimizationId),
            status: OPTIMIZATION_STATUS.COMPLETED,
            executionResult: optimizationState.executionResult,
        });
    } else {
        optimizationState.status = OPTIMIZATION_STATUS.FAILED;
        optimizationState.completedAt = new Date().toISOString();
        optimizationState.executionResult = {
            success: false,
            appliedAt: new Date().toISOString(),
            details: 'Execution failed - will retry in Phase 4',
        };

        await state.set('optimizations', optimizationId, optimizationState);
        logger.info('workflow.energy.optimize: STATE TRANSITION → FAILED', {
            key: STATE_KEYS.optimization(optimizationId),
            status: OPTIMIZATION_STATUS.FAILED,
            executionResult: optimizationState.executionResult,
        });
    }

    logger.info('workflow.energy.optimize: WORKFLOW COMPLETE', {
        optimizationId,
        finalStatus: optimizationState.status,
        duration: `${Date.now() - new Date(triggeredAt).getTime()}ms`,
    });
};

/**
 * Deterministic analysis function (Phase 2 placeholder for AI in Phase 3)
 * Makes a decision based on the excess amount
 */
function analyzeUsagePattern(
    totalConsumption: number,
    threshold: number,
    excessAmount: number
): OptimizationDecision {
    // Simple deterministic logic for Phase 2
    const excessPercent = (excessAmount / threshold) * 100;

    if (excessPercent > 20) {
        return {
            action: 'SHIFT_LOAD',
            targetWindow: '02:00-05:00',
            expectedSavingsPercent: Math.min(25, excessPercent),
            confidence: 0.85,
            reasoning: `High excess (${excessPercent.toFixed(1)}%) - recommending load shift to off-peak hours`,
        };
    } else if (excessPercent > 10) {
        return {
            action: 'REDUCE_CONSUMPTION',
            targetWindow: '18:00-22:00',
            expectedSavingsPercent: Math.min(15, excessPercent),
            confidence: 0.78,
            reasoning: `Moderate excess (${excessPercent.toFixed(1)}%) - recommending consumption reduction during peak`,
        };
    } else {
        return {
            action: 'OPTIMIZE_SCHEDULING',
            targetWindow: '12:00-16:00',
            expectedSavingsPercent: Math.min(10, excessPercent),
            confidence: 0.72,
            reasoning: `Minor excess (${excessPercent.toFixed(1)}%) - recommending schedule optimization`,
        };
    }
}

/**
 * Simulated execution (Phase 2 placeholder for job.energy.execute in Phase 4)
 * Always succeeds for demo purposes
 */
function simulateExecution(_decision: OptimizationDecision): boolean {
    // Always succeed in Phase 2 for demo visibility
    return true;
}
