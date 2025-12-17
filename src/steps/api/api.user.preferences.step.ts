/**
 * API Step: User Preferences
 * 
 * Name: api.user.preferences
 * Type: API Step
 * Trigger: HTTP POST /api/user/preferences
 * 
 * Responsibility:
 * - Accept user energy preferences
 * - Persist configuration to state
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import {
    STATE_KEYS,
    FLOWS,
    type UserPreferences
} from '../../constants';

export const config: ApiRouteConfig = {
    name: 'api.user.preferences',
    type: 'api',
    path: '/api/user/preferences',
    method: 'POST',
    description: 'Accepts and persists user energy preferences',
    emits: [],
    flows: [FLOWS.ENERGY_OPTIMIZATION],
};

export const handler: Handlers['api.user.preferences'] = async (req, { logger, state }) => {
    logger.info('User preferences update received', { body: req.body });

    const body = req.body as {
        thresholds?: { dailyMax?: number; peakHourLimit?: number };
        costSensitivity?: 'low' | 'medium' | 'high';
        automationLevel?: 'manual' | 'suggested' | 'automatic';
    };

    const preferences: UserPreferences = {
        thresholds: {
            dailyMax: body.thresholds?.dailyMax ?? 100,
            peakHourLimit: body.thresholds?.peakHourLimit ?? 50,
        },
        costSensitivity: body.costSensitivity ?? 'medium',
        automationLevel: body.automationLevel ?? 'suggested',
    };

    // Write to user preferences state
    await state.set('user', 'preferences', preferences);
    logger.info('User preferences saved', { key: STATE_KEYS.userPreferences, preferences });

    return {
        status: 200,
        body: {
            success: true,
            message: 'User preferences updated successfully',
            preferences,
        },
    };
};
