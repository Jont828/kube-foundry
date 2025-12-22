import { useQuery } from '@tanstack/react-query'
import { healthApi, type ClusterStatusResponse, type ClusterNode } from '@/lib/api'

export function useClusterStatus() {
  return useQuery<ClusterStatusResponse>({
    queryKey: ['cluster-status'],
    queryFn: async () => {
      try {
        return await healthApi.clusterStatus()
      } catch {
        return {
          connected: false,
          namespace: 'default',
          error: 'Failed to connect to backend',
        }
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  })
}

export function useClusterNodes(enabled: boolean = true) {
  return useQuery<{ nodes: ClusterNode[] }>({
    queryKey: ['cluster-nodes'],
    queryFn: () => healthApi.getClusterNodes(),
    enabled,
    staleTime: 60000, // 1 minute
    retry: 1,
  })
}
