/**
 * Integration Tests: Gemini AI Analyzer
 * 
 * Tests the AI-powered analysis functionality.
 * Note: Tests focusing on fallback behavior (no API mocking required).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockLogger } from '../helpers/mock-context';
import { analyzeWithGemini, isGeminiAvailable, resetGeminiClient, type AnalysisInput } from '../../src/ai/gemini-analyzer';

describe('gemini-analyzer', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;
    let originalApiKey: string | undefined;

    beforeEach(() => {
        mockLogger = createMockLogger();
        originalApiKey = process.env.GEMINI_API_KEY;
        // Reset client state to ensure clean test isolation
        resetGeminiClient();
    });

    afterEach(() => {
        // Restore original API key
        if (originalApiKey) {
            process.env.GEMINI_API_KEY = originalApiKey;
        } else {
            delete process.env.GEMINI_API_KEY;
        }
        // Reset again after each test
        resetGeminiClient();
    });

    const createInput = (overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
        totalConsumption: 150,
        threshold: 100,
        excessAmount: 50,
        date: '2025-12-18',
        ...overrides,
    });

    describe('isGeminiAvailable', () => {
        it('should return true when GEMINI_API_KEY is set', () => {
            process.env.GEMINI_API_KEY = 'test-key';
            expect(isGeminiAvailable()).toBe(true);
        });

        it('should return false when GEMINI_API_KEY is not set', () => {
            delete process.env.GEMINI_API_KEY;
            expect(isGeminiAvailable()).toBe(false);
        });

        it('should return false when GEMINI_API_KEY is empty string', () => {
            process.env.GEMINI_API_KEY = '';
            expect(isGeminiAvailable()).toBe(false);
        });
    });

    describe('analyzeWithGemini - Fallback Behavior (No API Key)', () => {
        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
        });

        it('should return fallback decision when API key is missing', async () => {
            const result = await analyzeWithGemini(createInput(), mockLogger);

            expect(result.source).toBe('fallback');
            expect(result.model).toBeUndefined();
            expect(result.action).toBeDefined();
            expect(result.targetWindow).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should log warning when using fallback', async () => {
            await analyzeWithGemini(createInput(), mockLogger);

            const hasFallbackLog = mockLogger.logs.some(l =>
                l.message.toLowerCase().includes('fallback')
            );
            expect(hasFallbackLog).toBe(true);
        });
    });

    describe('Fallback Decision Logic - SHIFT_LOAD (>20% excess)', () => {
        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
        });

        it('should recommend SHIFT_LOAD for 50% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 50, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('SHIFT_LOAD');
            expect(result.targetWindow).toBe('02:00-05:00');
            expect(result.source).toBe('fallback');
        });

        it('should recommend SHIFT_LOAD for 25% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 25, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('SHIFT_LOAD');
        });

        it('should recommend SHIFT_LOAD for exactly 21% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 21, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('SHIFT_LOAD');
        });
    });

    describe('Fallback Decision Logic - REDUCE_CONSUMPTION (10-20% excess)', () => {
        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
        });

        it('should recommend REDUCE_CONSUMPTION for 15% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 15, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('REDUCE_CONSUMPTION');
            expect(result.targetWindow).toBe('18:00-22:00');
            expect(result.source).toBe('fallback');
        });

        it('should recommend REDUCE_CONSUMPTION for exactly 20% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 20, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('REDUCE_CONSUMPTION');
        });

        it('should recommend REDUCE_CONSUMPTION for 11% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 11, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('REDUCE_CONSUMPTION');
        });
    });

    describe('Fallback Decision Logic - OPTIMIZE_SCHEDULING (<10% excess)', () => {
        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
        });

        it('should recommend OPTIMIZE_SCHEDULING for 5% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 5, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('OPTIMIZE_SCHEDULING');
            expect(result.targetWindow).toBe('12:00-16:00');
            expect(result.source).toBe('fallback');
        });

        it('should recommend OPTIMIZE_SCHEDULING for exactly 10% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 10, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('OPTIMIZE_SCHEDULING');
        });

        it('should recommend OPTIMIZE_SCHEDULING for 1% excess', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 1, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('OPTIMIZE_SCHEDULING');
        });
    });

    describe('Fallback Response Structure', () => {
        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
        });

        it('should include all required decision fields', async () => {
            const result = await analyzeWithGemini(createInput(), mockLogger);

            expect(result).toHaveProperty('action');
            expect(result).toHaveProperty('targetWindow');
            expect(result).toHaveProperty('expectedSavingsPercent');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('reasoning');
            expect(result).toHaveProperty('source');
        });

        it('should cap expectedSavingsPercent at 25 for high excess', async () => {
            // 100% excess should be capped
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 100, threshold: 100 }),
                mockLogger
            );

            expect(result.expectedSavingsPercent).toBeLessThanOrEqual(25);
        });

        it('should have confidence between 0.7 and 1.0', async () => {
            const result = await analyzeWithGemini(createInput(), mockLogger);

            expect(result.confidence).toBeGreaterThanOrEqual(0.7);
            expect(result.confidence).toBeLessThanOrEqual(1.0);
        });

        it('should include reasoning explaining the decision', async () => {
            const result = await analyzeWithGemini(createInput(), mockLogger);

            expect(result.reasoning).toBeDefined();
            expect(result.reasoning!.length).toBeGreaterThan(10);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
        });

        it('should handle very small threshold values', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 0.5, threshold: 1 }),
                mockLogger
            );

            expect(result.source).toBe('fallback');
            expect(result.action).toBeDefined();
        });

        it('should handle very large excess values', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 10000, threshold: 100 }),
                mockLogger
            );

            expect(result.action).toBe('SHIFT_LOAD');
            expect(result.expectedSavingsPercent).toBeLessThanOrEqual(25);
        });

        it('should handle floating point values', async () => {
            const result = await analyzeWithGemini(
                createInput({ excessAmount: 15.5, threshold: 100.25 }),
                mockLogger
            );

            expect(result.source).toBe('fallback');
            expect(result.action).toBeDefined();
        });
    });
});
