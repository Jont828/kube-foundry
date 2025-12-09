/**
 * Settings and Provider types
 */

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  defaultNamespace: string;
}

export interface CRDConfig {
  apiGroup: string;
  apiVersion: string;
  plural: string;
  kind: string;
}

export interface InstallationStep {
  title: string;
  command?: string;
  description: string;
}

export interface HelmRepo {
  name: string;
  url: string;
}

export interface HelmChart {
  name: string;
  chart: string;
  version?: string;
  namespace: string;
  createNamespace?: boolean;
}

export interface ProviderDetails extends ProviderInfo {
  crdConfig: CRDConfig;
  installationSteps: InstallationStep[];
  helmRepos: HelmRepo[];
  helmCharts: HelmChart[];
}

export interface AppConfig {
  activeProviderId: string;
  defaultNamespace?: string;
}

export interface Settings {
  config: AppConfig;
  providers: ProviderInfo[];
  activeProvider: ProviderInfo | null;
}
