/**
 * React hooks for cost estimation
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { costsApi, type CostEstimateInput, type CostSettings, type CostEstimate } from '@/lib/api'

/**
 * Hook to get available cloud providers
 */
export function useCloudProviders() {
  return useQuery({
    queryKey: ['costs', 'providers'],
    queryFn: () => costsApi.getProviders(),
    staleTime: 1000 * 60 * 60, // 1 hour - pricing info doesn't change often
  })
}

/**
 * Hook to get available GPU types
 */
export function useGpuTypes() {
  return useQuery({
    queryKey: ['costs', 'gpuTypes'],
    queryFn: () => costsApi.getGpuTypes(),
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook to calculate cost estimate
 */
export function useCostEstimate() {
  return useMutation({
    mutationFn: ({ input, settings }: { input: CostEstimateInput; settings?: CostSettings }) =>
      costsApi.estimate(input, settings),
  })
}

/**
 * Hook to compare costs between configurations
 */
export function useCostComparison() {
  return useMutation({
    mutationFn: ({
      aggregated,
      disaggregated,
      settings,
    }: {
      aggregated: Omit<CostEstimateInput, 'mode'>
      disaggregated: Omit<CostEstimateInput, 'mode'>
      settings?: CostSettings
    }) => costsApi.compare(aggregated, disaggregated, settings),
  })
}

/**
 * Calculate cost estimate locally (for immediate UI feedback)
 * This mirrors the backend logic for instant calculations
 */
export function calculateLocalCostEstimate(
  mode: 'aggregated' | 'disaggregated',
  replicas: number,
  gpusPerReplica: number,
  prefillReplicas?: number,
  decodeReplicas?: number,
  prefillGpus?: number,
  decodeGpus?: number
): CostEstimate {
  let totalGpus: number
  let totalInstances: number
  
  if (mode === 'disaggregated') {
    const pReplicas = prefillReplicas ?? 1
    const dReplicas = decodeReplicas ?? 1
    const pGpus = prefillGpus ?? gpusPerReplica
    const dGpus = decodeGpus ?? gpusPerReplica
    
    totalGpus = (pReplicas * pGpus) + (dReplicas * dGpus)
    totalInstances = pReplicas + dReplicas
    
    return {
      resources: {
        prefillInstances: pReplicas,
        prefillGpusPerInstance: pGpus,
        decodeInstances: dReplicas,
        decodeGpusPerInstance: dGpus,
        totalGpus,
        totalInstances,
      },
      hasActualCosts: false,
      gpuMultiplier: totalGpus / gpusPerReplica,
      relativeDescription: `Disaggregated serving uses ${totalGpus} GPUs total`,
      baselineGpus: gpusPerReplica,
      additionalGpus: totalGpus - gpusPerReplica,
      percentageIncrease: ((totalGpus - gpusPerReplica) / gpusPerReplica) * 100,
    }
  }
  
  // Aggregated mode
  totalGpus = replicas * gpusPerReplica
  totalInstances = replicas
  
  return {
    resources: {
      workerInstances: replicas,
      gpusPerWorker: gpusPerReplica,
      totalGpus,
      totalInstances,
    },
    hasActualCosts: false,
    gpuMultiplier: totalGpus / gpusPerReplica,
    relativeDescription: `${totalGpus} GPU${totalGpus !== 1 ? 's' : ''} total`,
    baselineGpus: gpusPerReplica,
    additionalGpus: totalGpus - gpusPerReplica,
    percentageIncrease: ((totalGpus - gpusPerReplica) / gpusPerReplica) * 100,
  }
}
