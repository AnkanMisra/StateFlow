/**
 * Stream: Energy Optimization Status
 * 
 * Real-time streaming of optimization lifecycle status.
 * Clients can subscribe to receive updates as optimization progresses:
 * RECEIVED -> ANALYZING -> DECIDED -> EXECUTING -> COMPLETED/FAILED
 */

import { StreamConfig } from 'motia';
import { z } from 'zod';

// Decision schema for stream
const decisionSchema = z.object({
    action: z.string(),
    targetWindow: z.string(),
    expectedSavingsPercent: z.number(),
    confidence: z.number(),
    reasoning: z.string().optional(),
}).optional();

// Execution result schema for stream
const executionResultSchema = z.object({
    success: z.boolean(),
    appliedAt: z.string(),
    details: z.string(),
}).optional();

// Main stream data schema
export const energyStatusSchema = z.object({
    id: z.string(),
    optimizationId: z.string(),
    status: z.enum(['RECEIVED', 'ANALYZING', 'DECIDED', 'EXECUTING', 'COMPLETED', 'FAILED']),
    progress: z.number().min(0).max(100),
    decision: decisionSchema,
    executionResult: executionResultSchema,
    updatedAt: z.string(),
});

export type EnergyStatusData = z.infer<typeof energyStatusSchema>;

export const config: StreamConfig = {
    name: 'energyStatus',
    schema: energyStatusSchema,
    baseConfig: { storageType: 'default' },
};
