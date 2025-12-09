import { useState, useMemo } from 'react'
import { useModels } from '@/hooks/useModels'
import { useGpuCapacity } from '@/hooks/useGpuOperator'
import { ModelGrid } from '@/components/models/ModelGrid'
import { ModelSearch } from '@/components/models/ModelSearch'
import { HfModelSearch } from '@/components/models/HfModelSearch'
import { Loader2, BookMarked, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type Engine = 'vllm' | 'sglang' | 'trtllm'
type Tab = 'curated' | 'huggingface'

export function ModelsPage() {
  const { data: models, isLoading, error } = useModels()
  const { data: gpuCapacity } = useGpuCapacity()
  const [search, setSearch] = useState('')
  const [selectedEngines, setSelectedEngines] = useState<Engine[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('curated')

  const filteredModels = useMemo(() => {
    if (!models) return []

    return models.filter((model) => {
      // Filter by search
      const searchMatch = search === '' ||
        model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.id.toLowerCase().includes(search.toLowerCase()) ||
        model.description.toLowerCase().includes(search.toLowerCase())

      // Filter by engine
      const engineMatch = selectedEngines.length === 0 ||
        selectedEngines.some((engine) => model.supportedEngines.includes(engine))

      return searchMatch && engineMatch
    })
  }, [models, search, selectedEngines])

  const handleEngineToggle = (engine: Engine) => {
    setSelectedEngines((prev) =>
      prev.includes(engine)
        ? prev.filter((e) => e !== engine)
        : [...prev, engine]
    )
  }

  if (isLoading && activeTab === 'curated') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && activeTab === 'curated') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load models
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Model Catalog</h1>
        <p className="text-muted-foreground mt-1">
          Select a model to deploy to your Kubernetes cluster
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('curated')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'curated'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <BookMarked className="h-4 w-4" />
          Curated Models
        </button>
        <button
          onClick={() => setActiveTab('huggingface')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'huggingface'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Search className="h-4 w-4" />
          Search HuggingFace
        </button>
      </div>

      {/* Curated models tab */}
      {activeTab === 'curated' && (
        <>
          <ModelSearch
            search={search}
            onSearchChange={setSearch}
            selectedEngines={selectedEngines}
            onEngineToggle={handleEngineToggle}
          />
          <ModelGrid models={filteredModels} />
        </>
      )}

      {/* HuggingFace search tab */}
      {activeTab === 'huggingface' && (
        <HfModelSearch gpuCapacityGb={gpuCapacity?.totalMemoryGb} />
      )}
    </div>
  )
}
