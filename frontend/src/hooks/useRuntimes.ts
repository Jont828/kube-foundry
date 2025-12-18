import { useQuery } from '@tanstack/react-query'
import { runtimesApi, type RuntimesStatusResponse } from '@/lib/api'

/**
 * Hook to fetch the status of all inference runtimes
 * Returns installation and health status for each runtime (dynamo, kuberay)
 */
export function useRuntimesStatus() {
  return useQuery<RuntimesStatusResponse>({
    queryKey: ['runtimes-status'],
    queryFn: async () => {
      try {
        return await runtimesApi.getStatus()
      } catch {
        return {
          runtimes: [],
        }
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  })
}
