import type { Engine, HfApiModelResult, HfModelSearchResult } from '@kubefoundry/shared';
import { estimateGpuMemory, formatGpuMemory } from './gpuValidation';

/**
 * Architecture allowlists per inference engine
 * 
 * These are the model architectures that each engine has been verified to support.
 * Models with architectures not in this list may still work, but are not guaranteed.
 */
const ENGINE_ARCHITECTURE_ALLOWLIST: Record<Engine, string[]> = {
  vllm: [
    // LLaMA family
    'LlamaForCausalLM',
    'MistralForCausalLM',
    'MixtralForCausalLM',
    // Qwen family  
    'Qwen2ForCausalLM',
    'Qwen2MoeForCausalLM',
    'Qwen3ForCausalLM',
    // GPT family
    'GPT2LMHeadModel',
    'GPTNeoForCausalLM',
    'GPTNeoXForCausalLM',
    'GPTJForCausalLM',
    'GPTBigCodeForCausalLM',
    // Other popular architectures
    'FalconForCausalLM',
    'PhiForCausalLM',
    'Phi3ForCausalLM',
    'GemmaForCausalLM',
    'Gemma2ForCausalLM',
    'StableLmForCausalLM',
    'StarCoder2ForCausalLM',
    'OPTForCausalLM',
    'BloomForCausalLM',
    'MPTForCausalLM',
    'BaichuanForCausalLM',
    'InternLMForCausalLM',
    'InternLM2ForCausalLM',
    'ChatGLMModel',
    'CohereForCausalLM',
    'DbrxForCausalLM',
    'DeciLMForCausalLM',
    'DeepseekV2ForCausalLM',
    'ExaoneForCausalLM',
    'ArcticForCausalLM',
    'GraniteForCausalLM',
    'GraniteMoeForCausalLM',
    'JambaForCausalLM',
    'MiniCPMForCausalLM',
    'OlmoForCausalLM',
    'Olmo2ForCausalLM',
    'PersimmonForCausalLM',
    'SolarForCausalLM',
    'TeleChat2ForCausalLM',
    'XverseForCausalLM',
  ],
  sglang: [
    // LLaMA family
    'LlamaForCausalLM',
    'MistralForCausalLM',
    'MixtralForCausalLM',
    // Qwen family
    'Qwen2ForCausalLM',
    'Qwen2MoeForCausalLM',
    'Qwen3ForCausalLM',
    // GPT family
    'GPT2LMHeadModel',
    'GPTNeoXForCausalLM',
    'GPTBigCodeForCausalLM',
    // Other
    'GemmaForCausalLM',
    'Gemma2ForCausalLM',
    'PhiForCausalLM',
    'Phi3ForCausalLM',
    'StableLmForCausalLM',
    'InternLM2ForCausalLM',
    'DeepseekV2ForCausalLM',
    'OlmoForCausalLM',
    'Olmo2ForCausalLM',
    'ExaoneForCausalLM',
    'MiniCPMForCausalLM',
  ],
  trtllm: [
    // TensorRT-LLM has more limited but optimized support
    'LlamaForCausalLM',
    'MistralForCausalLM',
    'MixtralForCausalLM',
    'Qwen2ForCausalLM',
    'GPT2LMHeadModel',
    'GPTNeoXForCausalLM',
    'FalconForCausalLM',
    'PhiForCausalLM',
    'GemmaForCausalLM',
    'BloomForCausalLM',
    'MPTForCausalLM',
    'BaichuanForCausalLM',
    'ChatGLMModel',
  ],
};

/**
 * Supported pipeline tags for text generation models
 */
const SUPPORTED_PIPELINE_TAGS = [
  'text-generation',
  'text2text-generation',
  'conversational',
];

/**
 * Check which engines support a given architecture
 */
export function getSupportedEngines(architectures: string[]): Engine[] {
  const engines: Engine[] = [];
  
  for (const engine of ['vllm', 'sglang', 'trtllm'] as Engine[]) {
    const allowlist = ENGINE_ARCHITECTURE_ALLOWLIST[engine];
    const isSupported = architectures.some(arch => allowlist.includes(arch));
    if (isSupported) {
      engines.push(engine);
    }
  }
  
  return engines;
}

/**
 * Check if a model's pipeline tag is compatible with our engines
 */
export function isPipelineTagCompatible(pipelineTag?: string): boolean {
  if (!pipelineTag) return false;
  return SUPPORTED_PIPELINE_TAGS.includes(pipelineTag);
}

/**
 * Get incompatibility reason for a model
 */
export function getIncompatibilityReason(
  pipelineTag?: string,
  libraryName?: string,
  architectures?: string[],
  supportedEngines?: Engine[]
): string | undefined {
  if (!pipelineTag) {
    return 'Model has no pipeline tag';
  }
  
  if (!isPipelineTagCompatible(pipelineTag)) {
    return `Pipeline tag "${pipelineTag}" is not supported for inference`;
  }
  
  if (libraryName && libraryName !== 'transformers' && libraryName !== 'vllm') {
    return `Library "${libraryName}" is not supported`;
  }
  
  if (!architectures || architectures.length === 0) {
    return 'Model architecture is unknown';
  }
  
  if (!supportedEngines || supportedEngines.length === 0) {
    return `Architecture "${architectures[0]}" is not supported by any engine`;
  }
  
  return undefined;
}

/**
 * Extract parameter count from HuggingFace model metadata
 */
export function extractParameterCount(model: HfApiModelResult): number | undefined {
  // Try safetensors metadata first (most accurate)
  if (model.safetensors?.total) {
    return model.safetensors.total;
  }
  
  // Try parameters map from safetensors
  if (model.safetensors?.parameters) {
    const params = model.safetensors.parameters;
    // Sum all parameter counts (handles sharded models)
    const total = Object.values(params).reduce<number>((sum, count) => sum + (count as number), 0);
    if (total > 0) return total;
  }
  
  return undefined;
}

/**
 * Process a raw HuggingFace API result into our search result format
 */
export function processHfModel(model: HfApiModelResult): HfModelSearchResult {
  const architectures = model.config?.architectures || [];
  const supportedEngines = getSupportedEngines(architectures);
  const pipelineTag = model.pipeline_tag || '';
  const libraryName = model.library_name || '';
  
  const compatible = 
    isPipelineTagCompatible(pipelineTag) &&
    supportedEngines.length > 0 &&
    (libraryName === 'transformers' || libraryName === 'vllm' || libraryName === '');
  
  const incompatibilityReason = compatible 
    ? undefined 
    : getIncompatibilityReason(pipelineTag, libraryName, architectures, supportedEngines);
  
  const parameterCount = extractParameterCount(model);
  const gpuMemory = parameterCount ? estimateGpuMemory(parameterCount) : undefined;
  
  // Parse author from model ID (format: "author/model-name")
  const [author, ...nameParts] = model.id.split('/');
  const name = nameParts.join('/') || model.id;
  
  return {
    id: model.id,
    author: author || 'unknown',
    name: name,
    downloads: model.downloads || 0,
    likes: model.likes || 0,
    pipelineTag,
    libraryName,
    architectures,
    gated: model.gated === true || model.gated === 'auto' || model.gated === 'manual',
    parameterCount,
    estimatedGpuMemory: gpuMemory ? formatGpuMemory(gpuMemory) : undefined,
    estimatedGpuMemoryGb: gpuMemory,
    supportedEngines,
    compatible,
    incompatibilityReason,
  };
}

/**
 * Filter and process HuggingFace API results
 * Only returns compatible models
 */
export function filterCompatibleModels(models: HfApiModelResult[]): HfModelSearchResult[] {
  return models
    .map(processHfModel)
    .filter(model => model.compatible);
}

/**
 * Get architecture allowlist for a specific engine
 */
export function getEngineArchitectures(engine: Engine): string[] {
  return [...ENGINE_ARCHITECTURE_ALLOWLIST[engine]];
}
