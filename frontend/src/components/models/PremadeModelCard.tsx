import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type PremadeModel } from '@/lib/api'
import { Box, Cpu, Rocket, Scale, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PremadeModelCardProps {
  model: PremadeModel
  onSelect?: (model: PremadeModel) => void
}

export function PremadeModelCard({ model, onSelect }: PremadeModelCardProps) {
  const navigate = useNavigate()

  const handleDeploy = () => {
    if (onSelect) {
      onSelect(model)
    } else {
      // Navigate to deploy page with KAITO provider selected
      navigate(`/deploy?provider=kaito&model=${encodeURIComponent(model.id)}`)
    }
  }

  // Determine compute type badge color
  const computeBadgeVariant = model.computeType === 'cpu' ? 'default' : 'secondary'
  const ComputeIcon = model.computeType === 'cpu' ? Cpu : Server

  return (
    <Card
      interactive
      className={cn(
        "flex flex-col h-full group",
        "hover:border-nvidia/50 hover:shadow-glow",
        "[--glow-color:theme(colors.nvidia.DEFAULT/0.15)]"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight group-hover:text-nvidia transition-colors duration-200">
            {model.name}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 font-mono text-xs">
            {model.size}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground font-mono truncate">
          {model.modelName}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {model.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {model.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ComputeIcon className="h-4 w-4 shrink-0" />
            <span className="capitalize">{model.computeType} inference</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Box className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs font-mono">{model.image.split('/').pop()}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Scale className="h-4 w-4 shrink-0" />
            <span className="capitalize">{model.license} License</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          <Badge
            variant={computeBadgeVariant}
            className="text-xs font-medium"
          >
            {model.computeType.toUpperCase()}
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs font-medium"
          >
            KAITO
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-medium"
          >
            GGUF
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          onClick={handleDeploy}
          className="w-full group/btn"
        >
          <Rocket className="mr-2 h-4 w-4 transition-transform duration-200 group-hover/btn:-translate-y-0.5" />
          Deploy Model
        </Button>
      </CardFooter>
    </Card>
  )
}
