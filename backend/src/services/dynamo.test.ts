import { describe, it, expect } from 'bun:test';
import { generateDynamoManifest, validateManifest } from './dynamo';

describe('generateDynamoManifest', () => {
  const baseConfig = {
    name: 'test-deployment',
    namespace: 'kubefoundry-system',
    modelId: 'Qwen/Qwen3-0.6B',
    engine: 'vllm' as const,
    mode: 'aggregated' as const,
    routerMode: 'none' as const,
    replicas: 1,
    hfTokenSecret: 'hf-token-secret',
    enforceEager: true,
    enablePrefixCaching: false,
    trustRemoteCode: false,
  };

  describe('manifest structure', () => {
    it('generates correct apiVersion and kind', () => {
      const manifest = generateDynamoManifest(baseConfig);
      expect(manifest.apiVersion).toBe('nvidia.com/v1alpha1');
      expect(manifest.kind).toBe('DynamoGraphDeployment');
    });

    it('generates correct metadata with kubefoundry labels', () => {
      const manifest = generateDynamoManifest(baseConfig);
      expect(manifest.metadata.name).toBe('test-deployment');
      expect(manifest.metadata.namespace).toBe('kubefoundry-system');
      expect(manifest.metadata.labels).toEqual({
        'app.kubernetes.io/name': 'kubefoundry',
        'app.kubernetes.io/instance': 'test-deployment',
        'app.kubernetes.io/managed-by': 'kubefoundry',
        'kubefoundry.io/provider': 'dynamo',
      });
    });

    it('includes backendFramework in spec', () => {
      const manifest = generateDynamoManifest(baseConfig);
      expect(manifest.spec.backendFramework).toBe('vllm');
    });

    it('includes spec.services with Frontend', () => {
      const manifest = generateDynamoManifest(baseConfig);
      const services = manifest.spec.services as Record<string, unknown>;
      expect(services.Frontend).toBeDefined();
      const frontend = services.Frontend as Record<string, unknown>;
      expect(frontend.componentType).toBe('frontend');
      expect(frontend.dynamoNamespace).toBe('test-deployment');
      expect(frontend.replicas).toBe(1);
    });
  });

  describe('engine selection', () => {
    it('generates VllmWorker in spec.services for vllm engine', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, engine: 'vllm' });
      const services = manifest.spec.services as Record<string, unknown>;
      expect(services.VllmWorker).toBeDefined();
      expect(services.SglangWorker).toBeUndefined();
      expect(services.TrtllmWorker).toBeUndefined();
    });

    it('generates SglangWorker in spec.services for sglang engine', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, engine: 'sglang' });
      const services = manifest.spec.services as Record<string, unknown>;
      expect(services.SglangWorker).toBeDefined();
      expect(services.VllmWorker).toBeUndefined();
      expect(services.TrtllmWorker).toBeUndefined();
    });

    it('generates TrtllmWorker in spec.services for trtllm engine', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, engine: 'trtllm' });
      const services = manifest.spec.services as Record<string, unknown>;
      expect(services.TrtllmWorker).toBeDefined();
      expect(services.VllmWorker).toBeUndefined();
      expect(services.SglangWorker).toBeUndefined();
    });
  });

  describe('worker spec configuration', () => {
    it('includes componentType and dynamoNamespace', () => {
      const manifest = generateDynamoManifest(baseConfig);
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      expect(worker.componentType).toBe('worker');
      expect(worker.dynamoNamespace).toBe('test-deployment');
    });

    it('includes model in extraPodSpec.mainContainer.args', () => {
      const manifest = generateDynamoManifest(baseConfig);
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).toContain('--model Qwen/Qwen3-0.6B');
    });

    it('includes custom served model name in args', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, servedModelName: 'custom-name' });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).toContain('--served-model-name custom-name');
    });

    it('includes replicas count', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, replicas: 3 });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      expect(worker.replicas).toBe(3);
    });

    it('includes envFromSecret with HF token secret', () => {
      const manifest = generateDynamoManifest(baseConfig);
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      expect(worker.envFromSecret).toBe('hf-token-secret');
    });
  });

  describe('optional configuration', () => {
    it('includes --enforce-eager in args when enabled', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, enforceEager: true });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).toContain('--enforce-eager');
    });

    it('excludes --enforce-eager in args when disabled', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, enforceEager: false });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).not.toContain('--enforce-eager');
    });

    it('includes --enable-prefix-caching in args when enabled', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, enablePrefixCaching: true });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).toContain('--enable-prefix-caching');
    });

    it('includes --trust-remote-code in args when enabled', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, trustRemoteCode: true });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).toContain('--trust-remote-code');
    });

    it('includes --max-model-len in args when contextLength is provided', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, contextLength: 4096 });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const extraPodSpec = worker.extraPodSpec as Record<string, unknown>;
      const mainContainer = extraPodSpec.mainContainer as Record<string, unknown>;
      const args = mainContainer.args as string[];
      expect(args[0]).toContain('--max-model-len 4096');
    });
  });

  describe('resource configuration', () => {
    it('includes GPU resources when specified', () => {
      const manifest = generateDynamoManifest({
        ...baseConfig,
        resources: { gpu: 2 },
      });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const resources = worker.resources as Record<string, Record<string, unknown>>;
      expect(resources.limits.gpu).toBe('2');
      expect(resources.requests.gpu).toBe('2');
    });

    it('includes memory when specified', () => {
      const manifest = generateDynamoManifest({
        ...baseConfig,
        resources: { gpu: 1, memory: '32Gi' },
      });
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      const resources = worker.resources as Record<string, Record<string, unknown>>;
      expect(resources.limits.memory).toBe('32Gi');
    });

    it('excludes resources when not specified', () => {
      const manifest = generateDynamoManifest(baseConfig);
      const services = manifest.spec.services as Record<string, unknown>;
      const worker = services.VllmWorker as Record<string, unknown>;
      expect(worker.resources).toBeUndefined();
    });
  });

  describe('router mode configuration', () => {
    it('excludes router-mode when set to none', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, routerMode: 'none' });
      const services = manifest.spec.services as Record<string, unknown>;
      const frontend = services.Frontend as Record<string, unknown>;
      expect(frontend['router-mode']).toBeUndefined();
    });

    it('includes router-mode when set to kv', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, routerMode: 'kv' });
      const services = manifest.spec.services as Record<string, unknown>;
      const frontend = services.Frontend as Record<string, unknown>;
      expect(frontend['router-mode']).toBe('kv');
    });

    it('includes router-mode when set to round-robin', () => {
      const manifest = generateDynamoManifest({ ...baseConfig, routerMode: 'round-robin' });
      const services = manifest.spec.services as Record<string, unknown>;
      const frontend = services.Frontend as Record<string, unknown>;
      expect(frontend['router-mode']).toBe('round-robin');
    });
  });
});

describe('validateManifest', () => {
  const validManifest = {
    apiVersion: 'nvidia.com/v1alpha1',
    kind: 'DynamoGraphDeployment',
    metadata: {
      name: 'test',
      namespace: 'kubefoundry-system',
    },
    spec: {
      backendFramework: 'vllm',
      services: {
        Frontend: { componentType: 'frontend', replicas: 1 },
        VllmWorker: { componentType: 'worker', replicas: 1 },
      },
    },
  };

  it('validates correct manifest with spec.services', () => {
    const result = validateManifest(validManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects invalid apiVersion', () => {
    const result = validateManifest({ ...validManifest, apiVersion: 'wrong/v1' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid or missing apiVersion');
  });

  it('detects invalid kind', () => {
    const result = validateManifest({ ...validManifest, kind: 'Deployment' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid or missing kind');
  });

  it('detects missing metadata.name', () => {
    const result = validateManifest({
      ...validManifest,
      metadata: { ...validManifest.metadata, name: '' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing metadata.name');
  });

  it('detects missing metadata.namespace', () => {
    const result = validateManifest({
      ...validManifest,
      metadata: { ...validManifest.metadata, namespace: '' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing metadata.namespace');
  });

  it('detects missing spec.services', () => {
    const result = validateManifest({
      ...validManifest,
      spec: { backendFramework: 'vllm' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing spec.services');
  });

  it('detects missing Frontend in spec.services', () => {
    const result = validateManifest({
      ...validManifest,
      spec: {
        ...validManifest.spec,
        services: {
          VllmWorker: { componentType: 'worker', replicas: 1 },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing Frontend in spec.services');
  });

  it('detects missing worker spec in spec.services', () => {
    const result = validateManifest({
      ...validManifest,
      spec: {
        ...validManifest.spec,
        services: {
          Frontend: { componentType: 'frontend', replicas: 1 },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing worker spec (VllmWorker, SglangWorker, or TrtllmWorker) in spec.services');
  });

  it('validates SglangWorker as valid worker in spec.services', () => {
    const result = validateManifest({
      ...validManifest,
      spec: {
        ...validManifest.spec,
        services: {
          Frontend: { componentType: 'frontend', replicas: 1 },
          SglangWorker: { componentType: 'worker', replicas: 1 },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('validates TrtllmWorker as valid worker in spec.services', () => {
    const result = validateManifest({
      ...validManifest,
      spec: {
        ...validManifest.spec,
        services: {
          Frontend: { componentType: 'frontend', replicas: 1 },
          TrtllmWorker: { componentType: 'worker', replicas: 1 },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const result = validateManifest({
      apiVersion: 'wrong',
      kind: 'wrong',
      metadata: { name: '', namespace: '' },
      spec: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
