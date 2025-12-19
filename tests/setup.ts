/**
 * Vitest Setup File
 * 
 * In CI, unsets GEMINI_API_KEY to force fast fallback mode.
 * Locally, uses real API if key is available.
 */

const isCI = process.env.CI === 'true';

if (isCI) {
    // Force fallback mode in CI for fast tests
    delete process.env.GEMINI_API_KEY;
    console.log('[TEST SETUP] CI mode: Using fast fallback (no API calls)');
}
