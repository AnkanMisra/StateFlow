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
 * - Publish status updates to energyStatus stream for real-time clients
 * - Write explicit lifecycle state transitions:
 *   RECEIVED -> ANALYZING -> DECIDED -> EXECUTING -> COMPLETED/FAILED
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

// Progress percentages for each status
const STATUS_PROGRESS: Record<string, number> = {
    [OPTIMIZATION_STATUS.RECEIVED]: 10,
    [OPTIMIZATION_STATUS.ANALYZING]: 30,
    [OPTIMIZATION_STATUS.DECIDED]: 60,
    [OPTIMIZATION_STATUS.EXECUTING]: 80,
    [OPTIMIZATION_STATUS.COMPLETED]: 100,
    [OPTIMIZATION_STATUS.FAILED]: 100,
};

export const config: EventConfig = {
    name: 'workflow.energy.optimize',
    type: 'event',
    description: 'Orchestrates the energy optimization lifecycle with real-time streaming',
    subscribes: [TOPICS.OPTIMIZATION_REQUIRED],
    emits: [TOPICS.EXECUTION_REQUESTED],
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

export const handler: Handlers['workflow.energy.optimize'] = async (input, { logger, state, emit, streams }) => {
    const { optimizationId, date, totalConsumption, threshold, excessAmount, triggeredAt } = input;

    logger.info('workflow.energy.optimize: WORKFLOW STARTED', {
        optimizationId,
        date,
        totalConsumption,
        threshold,
        excessAmount,
    });

    // Helper to publish status to stream
    const publishStatus = async (
        status: 'RECEIVED' | 'ANALYZING' | 'DECIDED' | 'EXECUTING' | 'COMPLETED' | 'FAILED',
        decision?: OptimizationDecision
    ) => {
        try {
            await streams.energyStatus.set(date, optimizationId, {
                id: optimizationId,
                optimizationId,
                status,
                progress: STATUS_PROGRESS[status] || 0,
                decision,
                updatedAt: new Date().toISOString(),
            });
        } catch (error) {
            logger.warn('workflow.energy.optimize: Stream update failed (non-blocking)', {
                optimizationId,
                status,
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }
    };

    // ========================================
    // STATE: RECEIVED
    // ========================================
    const optimizationState: OptimizationState = {
        id: optimizationId,
        status: OPTIMIZATION_STATUS.RECEIVED,
        triggeredAt,
    };

    await state.set('optimizations', optimizationId, optimizationState);
    await publishStatus(OPTIMIZATION_STATUS.RECEIVED);
    logger.info('workflow.energy.optimize: STATE TRANSITION -> RECEIVED', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.RECEIVED,
    });

    // ========================================
    // STATE: ANALYZING (AI-powered in Phase 3)
    // ========================================
    optimizationState.status = OPTIMIZATION_STATUS.ANALYZING;
    await state.set('optimizations', optimizationId, optimizationState);
    await publishStatus(OPTIMIZATION_STATUS.ANALYZING);
    logger.info('workflow.energy.optimize: STATE TRANSITION -> ANALYZING', {
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
    await publishStatus(OPTIMIZATION_STATUS.DECIDED, decision);
    logger.info('workflow.energy.optimize: STATE TRANSITION -> DECIDED', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.DECIDED,
        decision,
    });
    // ========================================
    // STATE: EXECUTING - Emit to Background Job Step
    // ========================================
    optimizationState.status = OPTIMIZATION_STATUS.EXECUTING;
    await state.set('optimizations', optimizationId, optimizationState);
    await publishStatus(OPTIMIZATION_STATUS.EXECUTING, decision);
    logger.info('workflow.energy.optimize: STATE TRANSITION -> EXECUTING', {
        key: STATE_KEYS.optimization(optimizationId),
        status: OPTIMIZATION_STATUS.EXECUTING,
    });

    // Emit to job.energy.execute for async execution
    // Job will write executionResult to state and stream when complete
    await emit({
        topic: TOPICS.EXECUTION_REQUESTED,
        data: {
            optimizationId,
            decision,
            triggeredAt,
            date, // Pass date for stream groupId
        },
    });

    logger.info('workflow.energy.optimize: EXECUTION REQUESTED', {
        optimizationId,
        topic: TOPICS.EXECUTION_REQUESTED,
        action: decision.action,
    });

    // Workflow completes after emitting - job executes asynchronously
    logger.info('workflow.energy.optimize: WORKFLOW ORCHESTRATION COMPLETE', {
        optimizationId,
        currentStatus: OPTIMIZATION_STATUS.EXECUTING,
        duration: `${Date.now() - new Date(triggeredAt).getTime()}ms`,
        note: 'Job Step will publish final status to stream',
    });
};
