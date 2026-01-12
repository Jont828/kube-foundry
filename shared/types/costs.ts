/**
 * Cost estimation types for deployment planning
 */

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'on-prem' | 'none';

/**
 * GPU type identifiers used for pricing lookup
 */
export type GpuType = 
  | 'nvidia-a100-40gb'
  | 'nvidia-a100-80gb'
  | 'nvidia-h100'
  | 'nvidia-h200'
  | 'nvidia-l40s'
  | 'nvidia-l4'
  | 'nvidia-t4'
  | 'nvidia-v100'
  | 'nvidia-a10g'
  | 'unknown';

/**
 * Pricing information for a specific GPU type
 */
export interface GpuPricing {
  gpuType: GpuType;
  displayName: string;
  hourlyRate: number;  // USD per GPU-hour
  memoryGb: number;    // GPU memory in GB
}

/**
 * Cloud provider pricing configuration
 */
export interface CloudProviderPricing {
  provider: CloudProvider;
  displayName: string;
  gpuPricing: Record<GpuType, number>;  // gpuType -> hourly rate
  lastUpdated: string;  // ISO date string
}

/**
 * Input for cost estimation calculation
 */
export interface CostEstimateInput {
  mode: 'aggregated' | 'disaggregated';
  replicas: number;
  gpusPerReplica: number;
  // Disaggregated mode specifics
  prefillReplicas?: number;
  decodeReplicas?: number;
  prefillGpus?: number;
  decodeGpus?: number;
  // Provider and GPU info
  cloudProvider?: CloudProvider;
  gpuType?: GpuType;
  customHourlyRate?: number;  // For on-prem or custom pricing
}

/**
 * Resource breakdown for cost estimation
 */
export interface ResourceBreakdown {
  // Aggregated mode
  workerInstances?: number;
  gpusPerWorker?: number;
  // Disaggregated mode
  prefillInstances?: number;
  prefillGpusPerInstance?: number;
  decodeInstances?: number;
  decodeGpusPerInstance?: number;
  // Totals
  totalGpus: number;
  totalInstances: number;
}

/**
 * Cost estimate result
 */
export interface CostEstimate {
  // Resource breakdown
  resources: ResourceBreakdown;
  
  // Actual costs (only if provider pricing available)
  hasActualCosts: boolean;
  hourlyRate?: number;       // USD per hour
  dailyRate?: number;        // USD per day
  monthlyRate?: number;      // USD per month (assuming 730 hours)
  gpuType?: GpuType;
  cloudProvider?: CloudProvider;
  
  // Relative comparison (always available)
  gpuMultiplier: number;     // e.g., 1.5x for disaggregated vs aggregated baseline
  relativeDescription: string;  // Human-readable comparison
  
  // Comparison with baseline (aggregated with 1 replica)
  baselineGpus: number;
  additionalGpus: number;
  percentageIncrease: number;
}

/**
 * Cost comparison between two configurations
 */
export interface CostComparison {
  aggregated: CostEstimate;
  disaggregated: CostEstimate;
  savingsDescription: string;
}

/**
 * User's cost estimation settings (stored in settings)
 */
export interface CostSettings {
  cloudProvider: CloudProvider;
  gpuType: GpuType;
  customHourlyRate?: number;  // Used when provider is 'on-prem' or 'none'
}
