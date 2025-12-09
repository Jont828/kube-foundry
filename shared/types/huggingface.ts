/**
 * HuggingFace OAuth and Secret Management Types
 */

import type { Engine } from './model';

/**
 * User information from HuggingFace whoami API
 */
export interface HfUserInfo {
  id: string;
  name: string;
  fullname: string;
  email?: string;
  avatarUrl?: string;
}

/**
 * Request to exchange OAuth authorization code for token
 */
export interface HfTokenExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/**
 * Response from token exchange endpoint
 */
export interface HfTokenExchangeResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string;
  user: HfUserInfo;
}

/**
 * Request to save HF token as K8s secret
 */
export interface HfSaveSecretRequest {
  accessToken: string;
}

/**
 * Status of HuggingFace secret across namespaces
 */
export interface HfSecretStatus {
  configured: boolean;
  namespaces: {
    name: string;
    exists: boolean;
  }[];
  user?: HfUserInfo;
}

// ============================================================================
// HuggingFace Model Search Types
// ============================================================================

/**
 * Parameters for searching HuggingFace models
 */
export interface HfSearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

/**
 * Safetensors metadata from HuggingFace model
 */
export interface HfSafetensorsInfo {
  total?: number;
  parameters?: Record<string, number>;
}

/**
 * Raw model result from HuggingFace API
 */
export interface HfApiModelResult {
  _id: string;
  id: string;
  modelId: string;
  author?: string;
  sha?: string;
  lastModified?: string;
  private?: boolean;
  gated?: boolean | 'auto' | 'manual';
  disabled?: boolean;
  downloads?: number;
  likes?: number;
  library_name?: string;
  tags?: string[];
  pipeline_tag?: string;
  mask_token?: string;
  card_data?: Record<string, unknown>;
  widget_data?: unknown[];
  config?: {
    architectures?: string[];
    model_type?: string;
    tokenizer_config?: Record<string, unknown>;
  };
  safetensors?: HfSafetensorsInfo;
}

/**
 * Processed model search result with compatibility info
 */
export interface HfModelSearchResult {
  id: string;
  author: string;
  name: string;
  downloads: number;
  likes: number;
  pipelineTag: string;
  libraryName: string;
  architectures: string[];
  gated: boolean;
  parameterCount?: number;
  estimatedGpuMemory?: string;
  estimatedGpuMemoryGb?: number;
  supportedEngines: Engine[];
  compatible: boolean;
  incompatibilityReason?: string;
}

/**
 * Response from model search endpoint
 */
export interface HfModelSearchResponse {
  models: HfModelSearchResult[];
  total: number;
  hasMore: boolean;
  query: string;
}
