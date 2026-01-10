/**
 * Cost Estimation Routes
 * 
 * Provides API endpoints for calculating deployment cost estimates
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  calculateCostEstimate,
  compareCosts,
  GPU_DISPLAY_NAMES,
  GPU_MEMORY,
  CLOUD_PROVIDER_NAMES,
  getProviderPricingSummary,
  PRICING_LAST_UPDATED,
} from '../services/costEstimation';
import type { CloudProvider, GpuType, CostEstimateInput, CostSettings } from '@kubefoundry/shared';
import logger from '../lib/logger';

const app = new Hono();

// Validation schemas
const costEstimateInputSchema = z.object({
  mode: z.enum(['aggregated', 'disaggregated']),
  replicas: z.number().int().min(1).default(1),
  gpusPerReplica: z.number().int().min(1).default(1),
  prefillReplicas: z.number().int().min(1).optional(),
  decodeReplicas: z.number().int().min(1).optional(),
  prefillGpus: z.number().int().min(1).optional(),
  decodeGpus: z.number().int().min(1).optional(),
  cloudProvider: z.enum(['aws', 'azure', 'gcp', 'on-prem', 'none']).optional(),
  gpuType: z.string().optional(),
  customHourlyRate: z.number().min(0).optional(),
});

const costSettingsSchema = z.object({
  cloudProvider: z.enum(['aws', 'azure', 'gcp', 'on-prem', 'none']),
  gpuType: z.string(),
  customHourlyRate: z.number().min(0).optional(),
});

/**
 * POST /costs/estimate
 * Calculate cost estimate for a single deployment configuration
 */
app.post('/estimate', async (c) => {
  try {
    const body = await c.req.json();
    const parseResult = costEstimateInputSchema.safeParse(body);
    
    if (!parseResult.success) {
      return c.json({ error: 'Invalid input', details: parseResult.error.errors }, 400);
    }
    
    const input: CostEstimateInput = {
      ...parseResult.data,
      gpuType: parseResult.data.gpuType as GpuType | undefined,
    };
    
    // Get settings from body if provided
    const settings = body.settings ? costSettingsSchema.safeParse(body.settings) : null;
    const costSettings: CostSettings | undefined = settings?.success
      ? { ...settings.data, gpuType: settings.data.gpuType as GpuType }
      : undefined;
    
    const estimate = calculateCostEstimate(input, costSettings);
    
    logger.debug({ input, estimate }, 'Cost estimate calculated');
    
    return c.json(estimate);
  } catch (error) {
    logger.error({ error }, 'Failed to calculate cost estimate');
    return c.json({ error: 'Failed to calculate cost estimate' }, 500);
  }
});

/**
 * POST /costs/compare
 * Compare costs between aggregated and disaggregated configurations
 */
app.post('/compare', async (c) => {
  try {
    const body = await c.req.json();
    
    const aggregatedResult = costEstimateInputSchema.safeParse({
      ...body.aggregated,
      mode: 'aggregated',
    });
    const disaggregatedResult = costEstimateInputSchema.safeParse({
      ...body.disaggregated,
      mode: 'disaggregated',
    });
    
    if (!aggregatedResult.success || !disaggregatedResult.success) {
      return c.json({
        error: 'Invalid input',
        details: {
          aggregated: aggregatedResult.error?.errors,
          disaggregated: disaggregatedResult.error?.errors,
        },
      }, 400);
    }
    
    const settings = body.settings ? costSettingsSchema.safeParse(body.settings) : null;
    const costSettings: CostSettings | undefined = settings?.success
      ? { ...settings.data, gpuType: settings.data.gpuType as GpuType }
      : undefined;
    
    const comparison = compareCosts(
      { ...aggregatedResult.data, gpuType: aggregatedResult.data.gpuType as GpuType | undefined },
      { ...disaggregatedResult.data, gpuType: disaggregatedResult.data.gpuType as GpuType | undefined },
      costSettings
    );
    
    return c.json(comparison);
  } catch (error) {
    logger.error({ error }, 'Failed to compare costs');
    return c.json({ error: 'Failed to compare costs' }, 500);
  }
});

/**
 * GET /costs/providers
 * Get list of supported cloud providers with pricing info
 */
app.get('/providers', (c) => {
  const providers = (['aws', 'azure', 'gcp', 'on-prem', 'none'] as CloudProvider[]).map(provider => ({
    id: provider,
    name: CLOUD_PROVIDER_NAMES[provider],
    pricingSummary: getProviderPricingSummary(provider),
    hasPricing: provider !== 'none' && provider !== 'on-prem',
  }));
  
  return c.json({
    providers,
    lastUpdated: PRICING_LAST_UPDATED,
  });
});

/**
 * GET /costs/gpu-types
 * Get list of supported GPU types with memory info
 */
app.get('/gpu-types', (c) => {
  const gpuTypes = (Object.keys(GPU_DISPLAY_NAMES) as GpuType[]).map(gpuType => ({
    id: gpuType,
    name: GPU_DISPLAY_NAMES[gpuType],
    memoryGb: GPU_MEMORY[gpuType],
  }));
  
  return c.json({ gpuTypes });
});

export default app;
