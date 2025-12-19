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
import { analyzeWithGemini, type AIDecision } from '../../ai/gemini-analyzer';

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
    // STATE: ANALYZING (AI-powered in Phase 3)
    // ========================================
    optimizationState.status = OPTIMIZATION_STATUS.ANALYZING;
    await state.set('optimizations', optimizationId, optimizationState);
    logger.info('workflow.energy.optimize: STATE TRANSITION → ANALYZING', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.ANALYZING,
    });

    // AI-powered analysis using Gemini (with fallback to deterministic)
    const analysisResult: AIDecision = await analyzeWithGemini(
        { totalConsumption, threshold, excessAmount, date },
        logger
    );
    logger.info('workflow.energy.optimize: Analysis complete', {
        recommendation: analysisResult.action,
        expectedSavings: analysisResult.expectedSavingsPercent,
        source: analysisResult.source,
        model: analysisResult.model,
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
// NOTE: analyzeUsagePattern() was removed in Phase 3
// Now using analyzeWithGemini() from src/ai/gemini-analyzer.ts

/**
 * Simulated execution (Phase 2 placeholder for job.energy.execute in Phase 4)
 * Always succeeds for demo purposes
 */
function simulateExecution(_decision: OptimizationDecision): boolean {
    // Always succeed in Phase 2 for demo visibility
    return true;
}
