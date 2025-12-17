/**
 * Test Helpers: Mock Motia Context
 * 
 * Provides mock implementations of Motia's state, emit, and logger
 * for unit testing Steps without running the full Motia runtime.
 */

export interface MockState {
    data: Map<string, unknown>;
    get: <T>(groupId: string, key: string) => Promise<T | null>;
    set: (groupId: string, key: string, value: unknown) => Promise<void>;
    clear: () => void;
}

export interface MockEmit {
    calls: Array<{ topic: string; data: unknown }>;
    fn: (event: { topic: string; data: unknown }) => Promise<void>;
}

export interface MockLogger {
    logs: Array<{ level: string; message: string; data?: unknown }>;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    clear: () => void;
}

/**
 * Creates a mock state manager that stores data in memory
 */
export function createMockState(): MockState {
    const data = new Map<string, unknown>();

    return {
        data,
        get: async <T>(groupId: string, key: string): Promise<T | null> => {
            const fullKey = `${groupId}/${key}`;
            return (data.get(fullKey) as T) ?? null;
        },
        set: async (groupId: string, key: string, value: unknown): Promise<void> => {
            const fullKey = `${groupId}/${key}`;
            data.set(fullKey, value);
        },
        clear: () => data.clear(),
    };
}

/**
 * Creates a mock emit function that records all emissions
 */
export function createMockEmit(): MockEmit {
    const calls: Array<{ topic: string; data: unknown }> = [];

    return {
        calls,
        fn: async (event: { topic: string; data: unknown }): Promise<void> => {
            calls.push(event);
        },
    };
}

/**
 * Creates a mock logger that records all log calls
 */
export function createMockLogger(): MockLogger {
    const logs: Array<{ level: string; message: string; data?: unknown }> = [];

    return {
        logs,
        info: (message: string, data?: unknown) => {
            logs.push({ level: 'info', message, data });
        },
        warn: (message: string, data?: unknown) => {
            logs.push({ level: 'warn', message, data });
        },
        error: (message: string, data?: unknown) => {
            logs.push({ level: 'error', message, data });
        },
        clear: () => logs.length = 0,
    };
}

/**
 * Creates a complete mock context for testing Steps
 */
export function createMockContext() {
    const state = createMockState();
    const emit = createMockEmit();
    const logger = createMockLogger();

    return {
        state,
        emit: emit.fn,
        emitCalls: emit.calls,
        logger,
        // Reset all mocks
        reset: () => {
            state.clear();
            emit.calls.length = 0;
            logger.clear();
        },
    };
}

/**
 * Helper to check if a specific log message was recorded
 */
export function hasLogMessage(logger: MockLogger, substring: string): boolean {
    return logger.logs.some(log => log.message.includes(substring));
}

/**
 * Helper to check if an event was emitted with a specific topic
 */
export function hasEmittedTopic(emit: MockEmit, topic: string): boolean {
    return emit.calls.some(call => call.topic === topic);
}

/**
 * Helper to get emitted events by topic
 */
export function getEmittedByTopic(emit: MockEmit, topic: string): unknown[] {
    return emit.calls.filter(call => call.topic === topic).map(call => call.data);
}
