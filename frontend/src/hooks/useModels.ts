import { useQuery } from '@tanstack/react-query'
import { modelsApi, huggingFaceApi, type Model, type HfModelSearchResult } from '@/lib/api'
import { getHfAccessToken } from './useHuggingFace'

// Fallback static models for when API is unavailable
const fallbackModels: Model[] = [
  {
    id: 'Qwen/Qwen3-0.6B',
    name: 'Qwen3 0.6B',
    description: 'Small, efficient model ideal for development and testing',
    size: '0.6B',
    task: 'text-generation',
    contextLength: 32768,
    supportedEngines: ['vllm', 'sglang', 'trtllm'],
    minGpuMemory: '4GB',
  },
  {
    id: 'Qwen/Qwen2.5-1.5B-Instruct',
    name: 'Qwen2.5 1.5B Instruct',
    description: 'Instruction-tuned model with strong performance',
    size: '1.5B',
    task: 'chat',
    contextLength: 32768,
    supportedEngines: ['vllm', 'sglang', 'trtllm'],
    minGpuMemory: '6GB',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
    name: 'DeepSeek R1 Distill 8B',
    description: 'Reasoning-focused model with strong analytical capabilities',
    size: '8B',
    task: 'chat',
    contextLength: 16384,
    supportedEngines: ['vllm', 'sglang'],
    minGpuMemory: '16GB',
  },
  {
    id: 'meta-llama/Llama-3.2-1B-Instruct',
    name: 'Llama 3.2 1B Instruct',
    description: 'Compact Llama model optimized for instruction following',
    size: '1B',
    task: 'chat',
    contextLength: 131072,
    supportedEngines: ['vllm', 'sglang', 'trtllm'],
    minGpuMemory: '4GB',
  },
  {
    id: 'meta-llama/Llama-3.2-3B-Instruct',
    name: 'Llama 3.2 3B Instruct',
    description: 'Balanced Llama model for various tasks',
    size: '3B',
    task: 'chat',
    contextLength: 131072,
    supportedEngines: ['vllm', 'sglang', 'trtllm'],
    minGpuMemory: '8GB',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B Instruct v0.3',
    description: 'Powerful instruction-tuned model from Mistral AI',
    size: '7B',
    task: 'chat',
    contextLength: 32768,
    supportedEngines: ['vllm', 'sglang', 'trtllm'],
    minGpuMemory: '16GB',
  },
  {
    id: 'microsoft/Phi-3-mini-4k-instruct',
    name: 'Phi-3 Mini 4K Instruct',
    description: "Microsoft's efficient small language model",
    size: '3.8B',
    task: 'chat',
    contextLength: 4096,
    supportedEngines: ['vllm', 'sglang'],
    minGpuMemory: '8GB',
  },
  {
    id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    name: 'TinyLlama 1.1B Chat',
    description: 'Lightweight chat model for resource-constrained environments',
    size: '1.1B',
    task: 'chat',
    contextLength: 2048,
    supportedEngines: ['vllm', 'sglang', 'trtllm'],
    minGpuMemory: '4GB',
  },
]

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      try {
        const data = await modelsApi.list()
        return data.models
      } catch {
        // Return fallback models if API is unavailable
        return fallbackModels
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useModel(id: string | undefined) {
  const { data: models } = useModels()

  return useQuery({
    queryKey: ['model', id],
    queryFn: async () => {
      if (!id) return null

      // First try to find in already loaded models
      const localModel = models?.find(m => m.id === id)
      if (localModel) return localModel

      // Otherwise fetch from API
      try {
        return await modelsApi.get(id)
      } catch {
        // Try fallback
        return fallbackModels.find(m => m.id === id) || null
      }
    },
    enabled: !!id,
  })
}

/**
 * Convert HF search result to Model type for deployment form
 */
export function hfModelToModel(hfModel: HfModelSearchResult): Model {
  // Convert parameter count to human-readable size
  let size = 'Unknown';
  if (hfModel.parameterCount) {
    const billions = hfModel.parameterCount / 1_000_000_000;
    if (billions >= 1) {
      size = `${billions.toFixed(1)}B`;
    } else {
      const millions = hfModel.parameterCount / 1_000_000;
      size = `${millions.toFixed(0)}M`;
    }
  }

  return {
    id: hfModel.id,
    name: hfModel.name,
    description: `${hfModel.author}/${hfModel.name} - ${hfModel.pipelineTag}`,
    size,
    task: hfModel.pipelineTag === 'text-generation' ? 'text-generation' : 'chat',
    supportedEngines: hfModel.supportedEngines,
    minGpuMemory: hfModel.estimatedGpuMemory,
    gated: hfModel.gated,
    // Extended fields from HF
    estimatedGpuMemory: hfModel.estimatedGpuMemory,
    estimatedGpuMemoryGb: hfModel.estimatedGpuMemoryGb,
    parameterCount: hfModel.parameterCount,
    fromHfSearch: true,
  };
}

/**
 * Hook to get a model from HuggingFace search
 * Used when deploying a model that came from HF search
 */
export function useHfModel(id: string | undefined) {
  const hfToken = getHfAccessToken();

  return useQuery({
    queryKey: ['hf-model', id],
    queryFn: async (): Promise<Model | null> => {
      if (!id) return null;

      // Search for the exact model ID
      const result = await huggingFaceApi.searchModels(id, {
        limit: 5,
        hfToken: hfToken ?? undefined,
      });

      // Find exact match
      const hfModel = result.models.find(m => m.id === id);
      if (!hfModel) return null;

      return hfModelToModel(hfModel);
    },
    enabled: !!id,
    staleTime: 60000, // 60 seconds
  });
}
