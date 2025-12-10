import { Badge } from '@/components/ui/badge'
import { type DeploymentStatus } from '@/lib/api'
import { CheckCircle2, Clock, Loader2, XCircle, Power } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeploymentStatusBadgeProps {
  phase: DeploymentStatus['phase']
  /** Show icon alongside text */
  showIcon?: boolean
  /** Compact mode - icon only */
  compact?: boolean
}

const statusConfig: Record<DeploymentStatus['phase'], {
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'
  icon: typeof Clock
  pulse: boolean
  label: string
}> = {
  Pending: {
    variant: 'warning',
    icon: Clock,
    pulse: true,
    label: 'Pending',
  },
  Deploying: {
    variant: 'info',
    icon: Loader2,
    pulse: true,
    label: 'Deploying',
  },
  Running: {
    variant: 'success',
    icon: CheckCircle2,
    pulse: false,
    label: 'Running',
  },
  Failed: {
    variant: 'destructive',
    icon: XCircle,
    pulse: false,
    label: 'Failed',
  },
  Terminating: {
    variant: 'secondary',
    icon: Power,
    pulse: true,
    label: 'Terminating',
  },
}

export function DeploymentStatusBadge({ 
  phase, 
  showIcon = true,
  compact = false 
}: DeploymentStatusBadgeProps) {
  const config = statusConfig[phase]
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant} 
      pulse={config.pulse}
      className={cn(
        'gap-1.5',
        compact && 'px-1.5'
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            'h-3 w-3',
            phase === 'Deploying' && 'animate-spin'
          )} 
        />
      )}
      {!compact && config.label}
    </Badge>
  )
}
