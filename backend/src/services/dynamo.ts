interface DeploymentConfig {
  name: string;
  namespace: string;
  modelId: string;
  engine: 'vllm' | 'sglang' | 'trtllm';
  mode: 'aggregated' | 'disaggregated';
  servedModelName?: string;
  routerMode: 'none' | 'kv' | 'round-robin';
  replicas: number;
  hfTokenSecret: string;
  contextLength?: number;
  enforceEager: boolean;
  enablePrefixCaching: boolean;
  trustRemoteCode: boolean;
  resources?: {
    gpu: number;
    memory?: string;
  };
  engineArgs?: Record<string, unknown>;
}

interface DynamoManifest {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
  };
  spec: Record<string, unknown>;
}

export function generateDynamoManifest(config: DeploymentConfig): DynamoManifest {
  const workerSpec = generateWorkerSpec(config);
  const frontendSpec = generateFrontendSpec(config);

  // Build services map with Frontend and appropriate worker
  const services: Record<string, unknown> = {
    Frontend: frontendSpec,
    ...workerSpec,
  };

  const manifest: DynamoManifest = {
    apiVersion: 'nvidia.com/v1alpha1',
    kind: 'DynamoGraphDeployment',
    metadata: {
      name: config.name,
      namespace: config.namespace,
      labels: {
        'app.kubernetes.io/name': 'kubefoundry',
        'app.kubernetes.io/instance': config.name,
        'app.kubernetes.io/managed-by': 'kubefoundry',
        'kubefoundry.io/provider': 'dynamo',
      },
    },
    spec: {
      backendFramework: config.engine,
      services,
    },
  };

  return manifest;
}

function generateFrontendSpec(config: DeploymentConfig): Record<string, unknown> {
  const spec: Record<string, unknown> = {
    componentType: 'frontend',
    dynamoNamespace: config.name,
    replicas: 1,
  };

  if (config.routerMode !== 'none') {
    spec['router-mode'] = config.routerMode;
  }

  // Add HF token secret for frontend as well
  if (config.hfTokenSecret) {
    spec.envFromSecret = config.hfTokenSecret;
  }

  return spec;
}

function generateWorkerSpec(config: DeploymentConfig): Record<string, unknown> {
  const baseSpec: Record<string, unknown> = {
    componentType: 'worker',
    dynamoNamespace: config.name,
    replicas: config.replicas,
  };

  // Add HF token secret
  if (config.hfTokenSecret) {
    baseSpec.envFromSecret = config.hfTokenSecret;
  }

  // Add resource requirements in the correct format
  if (config.resources) {
    baseSpec.resources = {
      limits: {
        gpu: String(config.resources.gpu),
        ...(config.resources.memory && { memory: config.resources.memory }),
      },
      requests: {
        gpu: String(config.resources.gpu),
        ...(config.resources.memory && { memory: config.resources.memory }),
      },
    };
  }

  // Build args for the inference engine
  const args: string[] = [];
  args.push(`python3 -m dynamo.${config.engine}`);
  args.push(`--model ${config.modelId}`);
  
  if (config.servedModelName) {
    args.push(`--served-model-name ${config.servedModelName}`);
  }

  if (config.enforceEager) {
    args.push('--enforce-eager');
  }

  if (config.enablePrefixCaching) {
    args.push('--enable-prefix-caching');
  }

  if (config.trustRemoteCode) {
    args.push('--trust-remote-code');
  }

  if (config.contextLength) {
    args.push(`--max-model-len ${config.contextLength}`);
  }

  // Add engine-specific arguments
  if (config.engineArgs) {
    Object.entries(config.engineArgs).forEach(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        args.push(`--${key}`);
      } else if (typeof value !== 'boolean') {
        args.push(`--${key} ${value}`);
      }
    });
  }

  baseSpec.extraPodSpec = {
    mainContainer: {
      workingDir: '/workspace/examples/backends/' + config.engine,
      command: ['/bin/sh', '-c'],
      args: [args.join(' ')],
    },
  };

  // Return with appropriate worker key based on engine
  switch (config.engine) {
    case 'vllm':
      return { VllmWorker: baseSpec };
    case 'sglang':
      return { SglangWorker: baseSpec };
    case 'trtllm':
      return { TrtllmWorker: baseSpec };
    default:
      return { VllmWorker: baseSpec };
  }
}

// Validate manifest against expected schema structure
export function validateManifest(manifest: DynamoManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest.apiVersion || manifest.apiVersion !== 'nvidia.com/v1alpha1') {
    errors.push('Invalid or missing apiVersion');
  }

  if (!manifest.kind || manifest.kind !== 'DynamoGraphDeployment') {
    errors.push('Invalid or missing kind');
  }

  if (!manifest.metadata?.name) {
    errors.push('Missing metadata.name');
  }

  if (!manifest.metadata?.namespace) {
    errors.push('Missing metadata.namespace');
  }

  if (!manifest.spec) {
    errors.push('Missing spec');
  }

  // Check for services map
  const services = manifest.spec?.services as Record<string, unknown> | undefined;
  if (!services) {
    errors.push('Missing spec.services');
  } else {
    if (!services.Frontend) {
      errors.push('Missing Frontend in spec.services');
    }

    const hasWorker = services.VllmWorker || services.SglangWorker || services.TrtllmWorker;
    if (!hasWorker) {
      errors.push('Missing worker spec (VllmWorker, SglangWorker, or TrtllmWorker) in spec.services');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
