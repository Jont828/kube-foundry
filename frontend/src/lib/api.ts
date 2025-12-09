// API Base URL - note: no /api suffix, the client adds routes
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('[API] API_BASE:', API_BASE);

// ============================================================================
// Re-export types from @kubefoundry/shared
// ============================================================================

// Core types
export type {
  Engine,
  ModelTask,
  Model,
  DeploymentMode,
  RouterMode,
  DeploymentPhase,
  PodPhase,
  DeploymentConfig,
  PodStatus,
  DeploymentStatus,
  ClusterStatus,
} from '@kubefoundry/shared';

// Settings types
export type {
  ProviderInfo,
  ProviderDetails,
  Settings,
} from '@kubefoundry/shared';

// Installation types
export type {
  HelmStatus,
  InstallationStatus,
  InstallResult,
  GPUOperatorStatus,
  GPUOperatorInstallResult,
  NodeGpuInfo,
  ClusterGpuCapacity,
} from '@kubefoundry/shared';

// API response types
export type {
  Pagination,
  DeploymentsListResponse,
  ClusterStatusResponse,
} from '@kubefoundry/shared';

// Import types for internal use
import type {
  Model,
  DeploymentConfig,
  DeploymentStatus,
  PodStatus,
  Settings,
  ProviderInfo,
  ProviderDetails,
  HelmStatus,
  InstallationStatus,
  InstallResult,
  GPUOperatorStatus,
  GPUOperatorInstallResult,
  ClusterGpuCapacity,
  DeploymentsListResponse,
  ClusterStatusResponse,
} from '@kubefoundry/shared';

// ============================================================================
// Error Handling
// ============================================================================

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;
  console.log('[API] Fetching:', url);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  console.log('[API] Response status:', response.status, 'for', url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('[API] Error response:', error);
    throw new ApiError(
      response.status,
      error.error?.message || error.message || 'Request failed'
    );
  }

  return response.json();
}

// ============================================================================
// Models API
// ============================================================================

export const modelsApi = {
  list: () => request<{ models: Model[] }>('/models'),
  get: (id: string) => request<Model>(`/models/${encodeURIComponent(id)}`),
};

// ============================================================================
// Deployments API
// ============================================================================

export const deploymentsApi = {
  list: (namespace?: string, options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    const query = params.toString();
    return request<DeploymentsListResponse>(`/deployments${query ? `?${query}` : ''}`);
  },

  get: (name: string, namespace?: string) =>
    request<DeploymentStatus>(
      `/deployments/${encodeURIComponent(name)}${namespace ? `?namespace=${encodeURIComponent(namespace)}` : ''}`
    ),

  create: (config: DeploymentConfig) =>
    request<{ message: string; name: string; namespace: string; warnings?: string[] }>('/deployments', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  delete: (name: string, namespace?: string) =>
    request<{ message: string }>(
      `/deployments/${encodeURIComponent(name)}${namespace ? `?namespace=${encodeURIComponent(namespace)}` : ''}`,
      { method: 'DELETE' }
    ),

  getPods: (name: string, namespace?: string) =>
    request<{ pods: PodStatus[] }>(
      `/deployments/${encodeURIComponent(name)}/pods${namespace ? `?namespace=${encodeURIComponent(namespace)}` : ''}`
    ),
};

// ============================================================================
// Health API
// ============================================================================

export const healthApi = {
  check: () => request<{ status: string; timestamp: string }>('/health'),
  clusterStatus: () => request<ClusterStatusResponse>('/cluster/status'),
};

// ============================================================================
// Settings API
// ============================================================================

export const settingsApi = {
  get: () => request<Settings>('/settings'),
  update: (settings: { activeProviderId?: string; defaultNamespace?: string }) =>
    request<{ message: string; config: Settings['config'] }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  listProviders: () => request<{ providers: ProviderInfo[] }>('/settings/providers'),
  getProvider: (id: string) => request<ProviderDetails>(`/settings/providers/${encodeURIComponent(id)}`),
};

// ============================================================================
// Installation API
// ============================================================================

export const installationApi = {
  getHelmStatus: () => request<HelmStatus>('/installation/helm/status'),

  getProviderStatus: (providerId: string) =>
    request<InstallationStatus>(`/installation/providers/${encodeURIComponent(providerId)}/status`),

  getProviderCommands: (providerId: string) =>
    request<{
      providerId: string;
      providerName: string;
      commands: string[];
      steps: Array<{ title: string; command?: string; description: string }>;
    }>(`/installation/providers/${encodeURIComponent(providerId)}/commands`),

  installProvider: (providerId: string) =>
    request<InstallResult>(`/installation/providers/${encodeURIComponent(providerId)}/install`, {
      method: 'POST',
    }),

  upgradeProvider: (providerId: string) =>
    request<InstallResult>(`/installation/providers/${encodeURIComponent(providerId)}/upgrade`, {
      method: 'POST',
    }),

  uninstallProvider: (providerId: string) =>
    request<InstallResult>(`/installation/providers/${encodeURIComponent(providerId)}/uninstall`, {
      method: 'POST',
    }),
};

// ============================================================================
// GPU Operator API
// ============================================================================

export const gpuOperatorApi = {
  getStatus: () => request<GPUOperatorStatus>('/installation/gpu-operator/status'),

  install: () =>
    request<GPUOperatorInstallResult>('/installation/gpu-operator/install', {
      method: 'POST',
    }),

  getCapacity: () => request<ClusterGpuCapacity>('/installation/gpu-capacity'),
};
