import { useQuery } from '@tanstack/react-query'
import { runtimesApi, type RuntimesStatusResponse } from '@/lib/api'

/**
 * Hook to get status of all runtimes (Dynamo, KubeRay)
 * Returns installation and health status for each runtime
 */
export function useRuntimesStatus() {
  return useQuery<RuntimesStatusResponse>({
    queryKey: ['runtimes-status'],
    queryFn: () => runtimesApi.getStatus(),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  })
}

/**
 * Get the list of installed runtimes
 */
export function useInstalledRuntimes() {
  const { data, ...rest } = useRuntimesStatus()
  
  const installedRuntimes = data?.runtimes.filter(r => r.installed) || []
  
  return {
    ...rest,
    data: installedRuntimes,
    hasAnyInstalled: installedRuntimes.length > 0,
  }
}

/**
 * Get the default runtime to use
 * Priority: Dynamo (if installed) > KubeRay (if installed) > Dynamo (fallback)
 */
export function useDefaultRuntime() {
  const { data: runtimes, isLoading } = useRuntimesStatus()
  
  if (isLoading || !runtimes) {
    return { runtime: undefined, isLoading }
  }
  
  // Prefer Dynamo if installed
  const dynamo = runtimes.runtimes.find(r => r.id === 'dynamo')
  if (dynamo?.installed) {
    return { runtime: dynamo, isLoading: false }
  }
  
  // Fall back to KubeRay if installed
  const kuberay = runtimes.runtimes.find(r => r.id === 'kuberay')
  if (kuberay?.installed) {
    return { runtime: kuberay, isLoading: false }
  }
  
  // Return Dynamo as default even if not installed (for UI display)
  return { runtime: dynamo || runtimes.runtimes[0], isLoading: false }
}
