import { type PremadeModel } from '@/lib/api'
import { PremadeModelCard } from './PremadeModelCard'
import { EmptyState } from '@/components/ui/empty-state'

interface PremadeModelGridProps {
  models: PremadeModel[]
  onSelect?: (model: PremadeModel) => void
}

export function PremadeModelGrid({ models, onSelect }: PremadeModelGridProps) {
  if (models.length === 0) {
    return (
      <EmptyState
        preset="no-results"
        title="No KAITO models available"
        description="Pre-made KAITO models could not be loaded. Please check your connection and try again."
      />
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {models.map((model, index) => (
        <div
          key={model.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <PremadeModelCard model={model} onSelect={onSelect} />
        </div>
      ))}
    </div>
  )
}
