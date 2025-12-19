/**
 * Gemini AI Analyzer
 * 
 * Provides AI-powered analysis using Google's gemini-3-flash-preview model.
 * Used by workflow.energy.optimize to make intelligent optimization decisions.
 * 
 * Fallback: Returns deterministic analysis if API fails.
 */

import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { OptimizationDecision } from '../constants';

// Load environment variables from .env.local and .env
config({ path: '.env.local' });
config({ path: '.env' });

// Gemini client - initialized lazily
let genAI: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
}

/**
 * Analysis input for the AI
 */
export interface AnalysisInput {
    totalConsumption: number;
    threshold: number;
    excessAmount: number;
    date: string;
}

/**
 * Extended decision with AI metadata
 */
export interface AIDecision extends OptimizationDecision {
    source: 'ai' | 'fallback';
    model?: string;
}

/**
 * AI-powered analysis using Gemini
 */
export async function analyzeWithGemini(
    input: AnalysisInput,
    logger: { info: (msg: string, data?: unknown) => void; warn: (msg: string, data?: unknown) => void }
): Promise<AIDecision> {
    const { totalConsumption, threshold, excessAmount, date } = input;
    const excessPercent = ((excessAmount / threshold) * 100).toFixed(1);

    try {
        const client = getGenAIClient();

        const prompt = `You are an energy optimization AI assistant. Analyze the following energy usage data and recommend an optimization action.

## Usage Data
- Date: ${date}
- Total Consumption: ${totalConsumption} kWh
- Daily Threshold: ${threshold} kWh
- Excess Amount: ${excessAmount} kWh (${excessPercent}% over threshold)

## Instructions
Based on this data, recommend ONE of these actions:
1. **SHIFT_LOAD** - Move high-consumption activities to off-peak hours (best for high excess > 20%)
2. **REDUCE_CONSUMPTION** - Reduce usage during peak hours (best for moderate excess 10-20%)
3. **OPTIMIZE_SCHEDULING** - Optimize appliance schedules (best for minor excess < 10%)

## Response Format
Return ONLY a valid JSON object with these exact fields:
{
  "action": "SHIFT_LOAD" | "REDUCE_CONSUMPTION" | "OPTIMIZE_SCHEDULING",
  "targetWindow": "HH:MM-HH:MM",
  "expectedSavingsPercent": <number 0-30>,
  "confidence": <number 0.0-1.0>,
  "reasoning": "<brief explanation>"
}`;

        logger.info('gemini-analyzer: Calling Gemini API', {
            model: 'gemini-3-flash-preview',
            excessPercent,
        });

        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        const text = response.text?.trim() || '';

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        if (text.includes('```json')) {
            jsonStr = text.split('```json')[1]?.split('```')[0]?.trim() || text;
        } else if (text.includes('```')) {
            jsonStr = text.split('```')[1]?.split('```')[0]?.trim() || text;
        }

        const parsed = JSON.parse(jsonStr);

        // Validate required fields
        if (!parsed.action || !parsed.targetWindow || parsed.confidence === undefined) {
            throw new Error('Invalid AI response structure');
        }

        const decision: AIDecision = {
            action: parsed.action,
            targetWindow: parsed.targetWindow,
            expectedSavingsPercent: Math.min(30, Math.max(0, parsed.expectedSavingsPercent || 10)),
            confidence: Math.min(1, Math.max(0, parsed.confidence)),
            reasoning: parsed.reasoning || 'AI-generated recommendation',
            source: 'ai',
            model: 'gemini-3-flash-preview',
        };

        logger.info('gemini-analyzer: AI analysis complete', {
            action: decision.action,
            confidence: decision.confidence,
            source: 'ai',
        });

        return decision;

    } catch (error) {
        logger.warn('gemini-analyzer: AI analysis failed, using fallback', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Fallback to deterministic analysis
        return fallbackAnalysis(input, logger);
    }
}

/**
 * Deterministic fallback when AI is unavailable
 */
function fallbackAnalysis(input: AnalysisInput, logger: { info: (msg: string, data?: unknown) => void }): AIDecision {
    const { threshold, excessAmount } = input;
    const excessPercent = (excessAmount / threshold) * 100;

    logger.info('gemini-analyzer: Using deterministic fallback', { excessPercent: excessPercent.toFixed(1) });

    if (excessPercent > 20) {
        return {
            action: 'SHIFT_LOAD',
            targetWindow: '02:00-05:00',
            expectedSavingsPercent: Math.min(25, excessPercent),
            confidence: 0.85,
            reasoning: `High excess (${excessPercent.toFixed(1)}%) - recommending load shift to off-peak hours`,
            source: 'fallback',
        };
    } else if (excessPercent > 10) {
        return {
            action: 'REDUCE_CONSUMPTION',
            targetWindow: '18:00-22:00',
            expectedSavingsPercent: Math.min(15, excessPercent),
            confidence: 0.78,
            reasoning: `Moderate excess (${excessPercent.toFixed(1)}%) - recommending consumption reduction during peak`,
            source: 'fallback',
        };
    } else {
        return {
            action: 'OPTIMIZE_SCHEDULING',
            targetWindow: '12:00-16:00',
            expectedSavingsPercent: Math.min(10, excessPercent),
            confidence: 0.72,
            reasoning: `Minor excess (${excessPercent.toFixed(1)}%) - recommending schedule optimization`,
            source: 'fallback',
        };
    }
}

/**
 * Check if Gemini API is available
 */
export function isGeminiAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
}
