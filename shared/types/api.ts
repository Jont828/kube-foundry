/**
 * API response types
 */

import { Model } from './model';
import { DeploymentStatus, ClusterStatus } from './deployment';
import { ProviderInfo, Settings, ProviderDetails, InstallationStep } from './settings';
import { InstallationStatus, InstallResult } from './installation';

/**
 * Pagination metadata
 */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// Health API Responses
// ============================================================================

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface ClusterStatusResponse extends ClusterStatus {
  provider?: ProviderInfo | null;
  providerInstallation?: {
    installed: boolean;
    version?: string;
    message?: string;
    crdFound?: boolean;
    operatorRunning?: boolean;
  } | null;
}

// ============================================================================
// Models API Responses
// ============================================================================

export interface ModelsListResponse {
  models: Model[];
}

// ============================================================================
// Settings API Responses
// ============================================================================

export interface SettingsUpdateResponse {
  message: string;
  config: Settings['config'];
}

export interface ProvidersListResponse {
  providers: ProviderInfo[];
}

// ============================================================================
// Deployments API Responses
// ============================================================================

export interface DeploymentsListResponse {
  deployments: DeploymentStatus[];
  pagination: Pagination;
}

export interface DeploymentCreateResponse {
  message: string;
  name: string;
  namespace: string;
  warnings?: string[];
}

export interface DeploymentDeleteResponse {
  message: string;
}

export interface DeploymentPodsResponse {
  pods: import('./deployment').PodStatus[];
}

// ============================================================================
// Installation API Responses
// ============================================================================

export interface ProviderCommandsResponse {
  providerId: string;
  providerName: string;
  commands: string[];
  steps: InstallationStep[];
}

// Re-export commonly used response types for convenience
export type {
  Settings,
  ProviderInfo,
  ProviderDetails,
  InstallationStatus,
  InstallResult,
};
