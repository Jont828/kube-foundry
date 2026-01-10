/**
 * Cost Estimation Service
 * 
 * Provides cost estimates for ML model deployments based on GPU requirements
 * and cloud provider pricing. Supports AWS, Azure, GCP, and custom pricing.
 */

import type {
  CloudProvider,
  GpuType,
  CostEstimateInput,
  CostEstimate,
  ResourceBreakdown,
  CostSettings,
} from '@kubefoundry/shared';

/**
 * GPU pricing data by cloud provider (USD per GPU-hour)
 * Prices are approximate and based on on-demand pricing as of late 2025
 * Users should verify current pricing with their cloud provider
 */
const GPU_PRICING: Record<CloudProvider, Record<GpuType, number>> = {
  aws: {
    'nvidia-a100-40gb': 3.40,
    'nvidia-a100-80gb': 4.10,
    'nvidia-h100': 5.10,
    'nvidia-h200': 6.50,
    'nvidia-l40s': 1.80,
    'nvidia-l4': 0.80,
    'nvidia-t4': 0.53,
    'nvidia-v100': 1.26,
    'nvidia-a10g': 1.21,
    'unknown': 2.50,  // Fallback estimate
  },
  azure: {
    'nvidia-a100-40gb': 3.40,
    'nvidia-a100-80gb': 3.67,
    'nvidia-h100': 5.00,
    'nvidia-h200': 6.20,
    'nvidia-l40s': 1.70,
    'nvidia-l4': 0.75,
    'nvidia-t4': 0.52,
    'nvidia-v100': 1.22,
    'nvidia-a10g': 1.10,
    'unknown': 2.40,
  },
  gcp: {
    'nvidia-a100-40gb': 3.17,
    'nvidia-a100-80gb': 3.67,
    'nvidia-h100': 5.07,
    'nvidia-h200': 6.30,
    'nvidia-l40s': 1.65,
    'nvidia-l4': 0.70,
    'nvidia-t4': 0.35,
    'nvidia-v100': 1.10,
    'nvidia-a10g': 1.00,
    'unknown': 2.30,
  },
  'on-prem': {
    // On-prem uses custom hourly rate, these are placeholders
    'nvidia-a100-40gb': 0,
    'nvidia-a100-80gb': 0,
    'nvidia-h100': 0,
    'nvidia-h200': 0,
    'nvidia-l40s': 0,
    'nvidia-l4': 0,
    'nvidia-t4': 0,
    'nvidia-v100': 0,
    'nvidia-a10g': 0,
    'unknown': 0,
  },
  'none': {
    // No pricing configured
    'nvidia-a100-40gb': 0,
    'nvidia-a100-80gb': 0,
    'nvidia-h100': 0,
    'nvidia-h200': 0,
    'nvidia-l40s': 0,
    'nvidia-l4': 0,
    'nvidia-t4': 0,
    'nvidia-v100': 0,
    'nvidia-a10g': 0,
    'unknown': 0,
  },
};

/**
 * GPU display names for UI
 */
export const GPU_DISPLAY_NAMES: Record<GpuType, string> = {
  'nvidia-a100-40gb': 'NVIDIA A100 40GB',
  'nvidia-a100-80gb': 'NVIDIA A100 80GB',
  'nvidia-h100': 'NVIDIA H100',
  'nvidia-h200': 'NVIDIA H200',
  'nvidia-l40s': 'NVIDIA L40S',
  'nvidia-l4': 'NVIDIA L4',
  'nvidia-t4': 'NVIDIA T4',
  'nvidia-v100': 'NVIDIA V100',
  'nvidia-a10g': 'NVIDIA A10G',
  'unknown': 'Unknown GPU',
};

/**
 * GPU memory sizes in GB
 */
export const GPU_MEMORY: Record<GpuType, number> = {
  'nvidia-a100-40gb': 40,
  'nvidia-a100-80gb': 80,
  'nvidia-h100': 80,
  'nvidia-h200': 141,
  'nvidia-l40s': 48,
  'nvidia-l4': 24,
  'nvidia-t4': 16,
  'nvidia-v100': 32,
  'nvidia-a10g': 24,
  'unknown': 16,
};

/**
 * Cloud provider display names
 */
export const CLOUD_PROVIDER_NAMES: Record<CloudProvider, string> = {
  aws: 'Amazon Web Services (AWS)',
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud Platform (GCP)',
  'on-prem': 'On-Premises / Custom',
  'none': 'Not Configured',
};

/**
 * Detect GPU type from memory size (heuristic)
 */
export function detectGpuTypeFromMemory(memoryGb: number | undefined): GpuType {
  if (!memoryGb) return 'unknown';
  
  // Match common GPU memory sizes
  if (memoryGb >= 140) return 'nvidia-h200';
  if (memoryGb >= 80) return 'nvidia-a100-80gb';  // or H100
  if (memoryGb >= 48) return 'nvidia-l40s';
  if (memoryGb >= 40) return 'nvidia-a100-40gb';
  if (memoryGb >= 32) return 'nvidia-v100';
  if (memoryGb >= 24) return 'nvidia-l4';  // or A10G
  if (memoryGb >= 16) return 'nvidia-t4';
  
  return 'unknown';
}

/**
 * Calculate resource breakdown for a deployment configuration
 */
export function calculateResourceBreakdown(input: CostEstimateInput): ResourceBreakdown {
  if (input.mode === 'disaggregated') {
    const prefillInstances = input.prefillReplicas ?? 1;
    const decodeInstances = input.decodeReplicas ?? 1;
    const prefillGpusPerInstance = input.prefillGpus ?? input.gpusPerReplica;
    const decodeGpusPerInstance = input.decodeGpus ?? input.gpusPerReplica;
    
    const totalGpus = (prefillInstances * prefillGpusPerInstance) + 
                      (decodeInstances * decodeGpusPerInstance);
    
    return {
      prefillInstances,
      prefillGpusPerInstance,
      decodeInstances,
      decodeGpusPerInstance,
      totalGpus,
      totalInstances: prefillInstances + decodeInstances,
    };
  }
  
  // Aggregated mode
  const workerInstances = input.replicas;
  const gpusPerWorker = input.gpusPerReplica;
  const totalGpus = workerInstances * gpusPerWorker;
  
  return {
    workerInstances,
    gpusPerWorker,
    totalGpus,
    totalInstances: workerInstances,
  };
}

/**
 * Get hourly rate for a GPU type and cloud provider
 */
export function getHourlyRate(
  cloudProvider: CloudProvider | undefined,
  gpuType: GpuType | undefined,
  customHourlyRate?: number
): number | undefined {
  // Use custom rate for on-prem or if explicitly provided
  if (cloudProvider === 'on-prem' && customHourlyRate !== undefined) {
    return customHourlyRate;
  }
  
  if (!cloudProvider || cloudProvider === 'none') {
    return undefined;
  }
  
  const providerPricing = GPU_PRICING[cloudProvider];
  if (!providerPricing) {
    return undefined;
  }
  
  const rate = providerPricing[gpuType ?? 'unknown'];
  return rate > 0 ? rate : undefined;
}

/**
 * Generate relative description comparing to baseline
 */
function generateRelativeDescription(
  totalGpus: number,
  baselineGpus: number,
  mode: 'aggregated' | 'disaggregated'
): string {
  if (totalGpus === baselineGpus) {
    return 'Same resource usage as baseline configuration';
  }
  
  const multiplier = totalGpus / baselineGpus;
  const percentIncrease = ((totalGpus - baselineGpus) / baselineGpus) * 100;
  
  if (mode === 'disaggregated') {
    if (multiplier > 1) {
      return `Disaggregated serving uses ${multiplier.toFixed(1)}x more GPUs (${percentIncrease.toFixed(0)}% increase) for better latency`;
    }
    return `Disaggregated serving uses fewer GPUs than expected`;
  }
  
  if (multiplier > 1) {
    return `${totalGpus} GPUs total (${multiplier.toFixed(1)}x baseline)`;
  }
  
  return `${totalGpus} GPU${totalGpus !== 1 ? 's' : ''} total`;
}

/**
 * Calculate cost estimate for a deployment configuration
 */
export function calculateCostEstimate(
  input: CostEstimateInput,
  costSettings?: CostSettings
): CostEstimate {
  const resources = calculateResourceBreakdown(input);
  
  // Use provided settings or fall back to input values
  const cloudProvider = input.cloudProvider ?? costSettings?.cloudProvider ?? 'none';
  const gpuType = input.gpuType ?? costSettings?.gpuType ?? 'unknown';
  const customHourlyRate = input.customHourlyRate ?? costSettings?.customHourlyRate;
  
  // Calculate baseline (1 replica, same GPUs per worker)
  const baselineGpus = input.gpusPerReplica;
  const additionalGpus = resources.totalGpus - baselineGpus;
  const percentageIncrease = baselineGpus > 0 
    ? ((resources.totalGpus - baselineGpus) / baselineGpus) * 100 
    : 0;
  const gpuMultiplier = baselineGpus > 0 ? resources.totalGpus / baselineGpus : 1;
  
  // Get hourly rate per GPU
  const perGpuHourlyRate = getHourlyRate(cloudProvider, gpuType, customHourlyRate);
  const hasActualCosts = perGpuHourlyRate !== undefined && perGpuHourlyRate > 0;
  
  // Calculate costs if pricing available
  let hourlyRate: number | undefined;
  let dailyRate: number | undefined;
  let monthlyRate: number | undefined;
  
  if (hasActualCosts && perGpuHourlyRate) {
    hourlyRate = resources.totalGpus * perGpuHourlyRate;
    dailyRate = hourlyRate * 24;
    monthlyRate = hourlyRate * 730; // Average hours per month
  }
  
  const relativeDescription = generateRelativeDescription(
    resources.totalGpus,
    baselineGpus,
    input.mode
  );
  
  return {
    resources,
    hasActualCosts,
    hourlyRate,
    dailyRate,
    monthlyRate,
    gpuType: hasActualCosts ? gpuType : undefined,
    cloudProvider: hasActualCosts ? cloudProvider : undefined,
    gpuMultiplier,
    relativeDescription,
    baselineGpus,
    additionalGpus,
    percentageIncrease,
  };
}

/**
 * Compare costs between aggregated and disaggregated configurations
 */
export function compareCosts(
  aggregatedInput: CostEstimateInput,
  disaggregatedInput: CostEstimateInput,
  costSettings?: CostSettings
): { aggregated: CostEstimate; disaggregated: CostEstimate; savingsDescription: string } {
  const aggregated = calculateCostEstimate(
    { ...aggregatedInput, mode: 'aggregated' },
    costSettings
  );
  const disaggregated = calculateCostEstimate(
    { ...disaggregatedInput, mode: 'disaggregated' },
    costSettings
  );
  
  const gpuDiff = disaggregated.resources.totalGpus - aggregated.resources.totalGpus;
  const percentDiff = aggregated.resources.totalGpus > 0
    ? (gpuDiff / aggregated.resources.totalGpus) * 100
    : 0;
  
  let savingsDescription: string;
  if (gpuDiff > 0) {
    savingsDescription = `Disaggregated serving uses ${gpuDiff} more GPU${gpuDiff !== 1 ? 's' : ''} (${percentDiff.toFixed(0)}% more) but provides better latency for high-throughput scenarios`;
  } else if (gpuDiff < 0) {
    savingsDescription = `Disaggregated serving uses ${Math.abs(gpuDiff)} fewer GPU${Math.abs(gpuDiff) !== 1 ? 's' : ''} (${Math.abs(percentDiff).toFixed(0)}% less)`;
  } else {
    savingsDescription = 'Both configurations use the same number of GPUs';
  }
  
  return {
    aggregated,
    disaggregated,
    savingsDescription,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  if (amount >= 100) {
    return `$${amount.toFixed(0)}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Get pricing summary for a cloud provider
 */
export function getProviderPricingSummary(provider: CloudProvider): { min: number; max: number; common: number } {
  const pricing = GPU_PRICING[provider];
  if (!pricing || provider === 'none' || provider === 'on-prem') {
    return { min: 0, max: 0, common: 0 };
  }
  
  const rates = Object.values(pricing).filter(r => r > 0);
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
    common: pricing['nvidia-a100-80gb'] || pricing['nvidia-h100'] || rates[0],
  };
}

/**
 * Pricing data last updated date
 */
export const PRICING_LAST_UPDATED = '2025-11-01';
