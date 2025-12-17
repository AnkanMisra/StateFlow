// State key constants for EcoPilot
// Using these constants prevents typos and ensures consistency

export const STATE_KEYS = {
    // Sensor State
    sensor: (sensorId: string) => `sensors/${sensorId}`,

    // Usage Aggregates
    usageRaw: (timestamp: string) => `usage/raw/${timestamp}`,
    usageDaily: (date: string) => `usage/daily/${date}`,

    // User Configuration
    userPreferences: 'user/preferences',

    // Optimization Lifecycle
    optimization: (id: string) => `optimizations/${id}`,
    optimizationDecision: (id: string) => `optimizations/${id}/decision`,
    optimizationResult: (id: string) => `optimizations/${id}/executionResult`,

    // System Health
    systemStatus: 'system/status',
} as const;

// Event topics
export const TOPICS = {
    SENSOR_READING_CREATED: 'sensor.reading.created',
    OPTIMIZATION_REQUIRED: 'optimization.required',
} as const;

// Flow names
export const FLOWS = {
    ENERGY_OPTIMIZATION: 'energy-optimization-flow',
} as const;

// Optimization lifecycle states
export const OPTIMIZATION_STATUS = {
    RECEIVED: 'RECEIVED',
    ANALYZING: 'ANALYZING',
    DECIDED: 'DECIDED',
    EXECUTING: 'EXECUTING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const;

// Types for sensor data
export interface SensorReading {
    sensorId: string;
    value: number;
    unit: string;
    timestamp: string;
    type: 'energy' | 'temperature' | 'humidity';
}

export interface SensorState {
    latestReading: SensorReading;
    lastUpdated: string;
}

export interface UsageDailyState {
    date: string;
    totalConsumption: number;
    peakUsage: number;
    avgUsage: number;
    readingCount: number;
    readings: number[];
}

export interface UserPreferences {
    thresholds: {
        dailyMax: number;
        peakHourLimit: number;
    };
    costSensitivity: 'low' | 'medium' | 'high';
    automationLevel: 'manual' | 'suggested' | 'automatic';
}

export interface OptimizationState {
    id: string;
    status: keyof typeof OPTIMIZATION_STATUS;
    triggeredAt: string;
    decision?: OptimizationDecision;
    executionResult?: OptimizationResult;
    completedAt?: string;
}

export interface OptimizationDecision {
    action: string;
    targetWindow: string;
    expectedSavingsPercent: number;
    confidence: number;
    reasoning?: string;
}

export interface OptimizationResult {
    success: boolean;
    appliedAt: string;
    details: string;
}

export interface SystemStatus {
    lastOptimization?: string;
    activeOptimizations: string[];
    totalOptimizationsToday: number;
}
