/**
 * Event Step: Sensor Process
 * 
 * Name: event.sensor.process
 * Type: Event Step
 * Trigger: sensor.reading.created
 * 
 * Responsibility:
 * - Aggregate usage data into usage/daily/{date}
 * - Read user/preferences for thresholds
 * - Decide deterministically whether optimization is needed
 * - Emit optimization.required if threshold exceeded
 * 
 * NO workflow logic here - aggregation + decision emission only.
 */

import type { EventConfig, Handlers } from 'motia';
import {
    TOPICS,
    FLOWS,
    STATE_KEYS,
    type UsageDailyState,
    type UserPreferences,
} from '../../constants';

// Default thresholds for demo (used if user preferences not set)
const DEFAULT_THRESHOLDS = {
    dailyMax: 100, // kWh - trigger optimization if exceeded
    peakHourLimit: 50, // kWh - not used in Phase 2
};

export const config: EventConfig = {
    name: 'event.sensor.process',
    type: 'event',
    description: 'Aggregates sensor readings and triggers optimization when thresholds exceeded',
    subscribes: [TOPICS.SENSOR_READING_CREATED],
    emits: [TOPICS.OPTIMIZATION_REQUIRED],
    flows: [FLOWS.ENERGY_OPTIMIZATION],
    input: {
        type: 'object',
        properties: {
            sensorId: { type: 'string' },
            value: { type: 'number' },
            unit: { type: 'string' },
            type: { type: 'string' },
            timestamp: { type: 'string' },
            date: { type: 'string' },
        },
        required: ['sensorId', 'value', 'unit', 'type', 'timestamp', 'date'],
    },
};

export const handler: Handlers['event.sensor.process'] = async (input, { emit, logger, state }) => {
    const { sensorId, value, date, timestamp } = input;

    logger.info('event.sensor.process: Processing sensor reading', {
        sensorId,
        value,
        date,
        timestamp,
    });

    // ========================================
    // STEP 1: Read existing daily usage state
    // ========================================
    let dailyUsage: UsageDailyState | null = await state.get<UsageDailyState>('usage', `daily/${date}`);

    if (!dailyUsage) {
        // Initialize daily usage for this date
        dailyUsage = {
            date,
            totalConsumption: 0,
            peakUsage: 0,
            avgUsage: 0,
            readingCount: 0,
            readings: [],
        };
        logger.info('event.sensor.process: Initialized new daily usage state', { date });
    }

    // ========================================
    // STEP 2: Update aggregates
    // ========================================
    const previousTotal = dailyUsage.totalConsumption;
    dailyUsage.readings.push(value);
    dailyUsage.readingCount = dailyUsage.readings.length;
    dailyUsage.totalConsumption = dailyUsage.readings.reduce((sum, v) => sum + v, 0);
    dailyUsage.peakUsage = Math.max(dailyUsage.peakUsage, value);
    dailyUsage.avgUsage = dailyUsage.totalConsumption / dailyUsage.readingCount;

    // Persist updated daily usage
    await state.set('usage', `daily/${date}`, dailyUsage);
    logger.info('event.sensor.process: Updated daily usage state', {
        key: STATE_KEYS.usageDaily(date),
        previousTotal,
        newTotal: dailyUsage.totalConsumption,
        readingCount: dailyUsage.readingCount,
        peakUsage: dailyUsage.peakUsage,
        avgUsage: dailyUsage.avgUsage.toFixed(2),
    });

    // ========================================
    // STEP 3: Read user preferences
    // ========================================
    const userPrefs: UserPreferences | null = await state.get<UserPreferences>('user', 'preferences');
    const thresholds = userPrefs?.thresholds ?? DEFAULT_THRESHOLDS;

    logger.info('event.sensor.process: Retrieved thresholds', {
        source: userPrefs ? 'user/preferences' : 'defaults',
        dailyMax: thresholds.dailyMax,
    });

    // ========================================
    // STEP 4: Deterministic decision - optimization required?
    // ========================================
    const thresholdExceeded = dailyUsage.totalConsumption > thresholds.dailyMax;

    logger.info('event.sensor.process: Threshold check', {
        totalConsumption: dailyUsage.totalConsumption,
        dailyMax: thresholds.dailyMax,
        thresholdExceeded,
    });

    if (thresholdExceeded) {
        // ========================================
        // IDEMPOTENCY CHECK: Only trigger once per day
        // ========================================
        const alreadyTriggered = await state.get<boolean>('usage', `daily/${date}/optimizationTriggered`);

        if (alreadyTriggered) {
            logger.info('event.sensor.process: Optimization already triggered for today, skipping duplicate', {
                date,
                totalConsumption: dailyUsage.totalConsumption,
            });
            logger.info('event.sensor.process: Processing complete');
            return;
        }

        // ========================================
        // STEP 5: Emit optimization.required
        // ========================================
        const optimizationId = `opt-${date}-${Date.now()}`;

        await emit({
            topic: TOPICS.OPTIMIZATION_REQUIRED,
            data: {
                optimizationId,
                date,
                totalConsumption: dailyUsage.totalConsumption,
                threshold: thresholds.dailyMax,
                excessAmount: dailyUsage.totalConsumption - thresholds.dailyMax,
                triggeredAt: new Date().toISOString(),
            },
        });

        // Mark this day as having triggered an optimization
        await state.set('usage', `daily/${date}/optimizationTriggered`, true);

        logger.info('event.sensor.process: EMITTED optimization.required', {
            topic: TOPICS.OPTIMIZATION_REQUIRED,
            optimizationId,
            totalConsumption: dailyUsage.totalConsumption,
            threshold: thresholds.dailyMax,
        });
    } else {
        logger.info('event.sensor.process: No optimization needed', {
            totalConsumption: dailyUsage.totalConsumption,
            remainingCapacity: thresholds.dailyMax - dailyUsage.totalConsumption,
        });
    }

    logger.info('event.sensor.process: Processing complete');
};
