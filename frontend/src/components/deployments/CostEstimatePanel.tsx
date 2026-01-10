/**
 * Cost Estimate Panel Component
 * 
 * Displays deployment cost estimates using cloud provider pricing.
 * Shows GPU costs for A10, A100, and H100 based on selected provider.
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Server, Layers, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CostEstimate, CloudProvider } from '@/lib/api'

interface CostEstimatePanelProps {
  estimate: CostEstimate
  mode: 'aggregated' | 'disaggregated'
  cloudProvider: CloudProvider
  className?: string
}

/**
 * Cloud provider display names
 */
const PROVIDER_NAMES: Record<CloudProvider, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  'on-prem': 'On-Prem',
  'none': 'Not Set',
}

/**
 * GPU pricing by cloud provider (USD per GPU-hour)
 * Shows common GPUs: A10G, A100, H100
 */
const GPU_PRICING: Record<CloudProvider, { a10: number; a100: number; h100: number }> = {
  aws: { a10: 1.21, a100: 4.10, h100: 5.10 },
  azure: { a10: 1.10, a100: 3.67, h100: 5.00 },
  gcp: { a10: 1.00, a100: 3.67, h100: 5.07 },
  'on-prem': { a10: 0, a100: 0, h100: 0 },
  'none': { a10: 0, a100: 0, h100: 0 },
}

export function CostEstimatePanel({ estimate, mode, cloudProvider, className }: CostEstimatePanelProps) {
  const { resources } = estimate
  const pricing = GPU_PRICING[cloudProvider] || GPU_PRICING.aws
  const hasProvider = cloudProvider && cloudProvider !== 'none'

  /**
   * Calculate cost for a GPU type given total GPUs
   */
  const calculateCost = (rate: number) => {
    return resources.totalGpus * rate
  }

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Cost Estimate
          {hasProvider && (
            <Badge variant="outline" className="text-xs font-normal ml-auto">
              {PROVIDER_NAMES[cloudProvider]}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resource Breakdown */}
        <div className="space-y-3">
          {mode === 'disaggregated' ? (
            <>
              {/* Disaggregated mode breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                    <Layers className="h-3 w-3" />
                    Prefill Workers
                  </div>
                  <div className="text-sm font-medium">
                    {resources.prefillInstances} × {resources.prefillGpusPerInstance} GPU{(resources.prefillGpusPerInstance ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
                    <Server className="h-3 w-3" />
                    Decode Workers
                  </div>
                  <div className="text-sm font-medium">
                    {resources.decodeInstances} × {resources.decodeGpusPerInstance} GPU{(resources.decodeGpusPerInstance ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Aggregated mode breakdown */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Workers
                </span>
                <span className="font-medium">
                  {resources.workerInstances} × {resources.gpusPerWorker} GPU{(resources.gpusPerWorker ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
          
          {/* Total GPUs */}
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Total GPUs</span>
            <span className="font-semibold">{resources.totalGpus}</span>
          </div>
        </div>

        {/* GPU Cost Table */}
        {hasProvider ? (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">
              Estimated hourly cost ({resources.totalGpus} GPU{resources.totalGpus !== 1 ? 's' : ''}):
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">A10</div>
                <div className="text-base font-semibold">${calculateCost(pricing.a10).toFixed(2)}/hr</div>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">A100</div>
                <div className="text-base font-semibold">${calculateCost(pricing.a100).toFixed(2)}/hr</div>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <div className="text-xs text-muted-foreground">H100</div>
                <div className="text-base font-semibold">${calculateCost(pricing.h100).toFixed(2)}/hr</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
              <Settings className="h-4 w-4 shrink-0" />
              <span>
                Select your cloud provider in{' '}
                <Link to="/settings" className="text-primary hover:underline font-medium">
                  Settings
                </Link>
                {' '}to see estimated costs.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
