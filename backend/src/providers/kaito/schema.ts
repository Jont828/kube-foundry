import { z } from 'zod';

/**
 * KAITO-specific deployment configuration schema
 * KAITO uses GGUF quantized models via AIKit, supporting both CPU and GPU inference
 */
export const kaitoDeploymentConfigSchema = z.object({
  // Basic deployment info
  name: z.string().min(1).max(63).regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, {
    message: 'Name must be a valid Kubernetes resource name (lowercase alphanumeric and hyphens)',
  }),
  namespace: z.string().min(1),
  provider: z.literal('kaito'),

  // Model source
  modelSource: z.enum(['premade', 'huggingface']),

  // For premade models (from AIKit curated list)
  premadeModel: z.string().optional(),

  // For HuggingFace GGUF models
  modelId: z.string().optional(),    // HF repo: 'TheBloke/Llama-2-7B-Chat-GGUF'
  ggufFile: z.string().optional(),   // File: 'llama-2-7b-chat.Q4_K_M.gguf'

  // Compute type - KAITO's key differentiator is CPU inference
  computeType: z.enum(['cpu', 'gpu']).default('cpu'),

  // Replicas
  replicas: z.number().int().min(1).max(10).default(1),

  // Node targeting
  labelSelector: z.record(z.string()).optional(),
  
  // Preferred nodes - use existing nodes instead of auto-provisioning
  preferredNodes: z.array(z.string()).optional(),

  // Resources
  resources: z.object({
    memory: z.string().optional(),      // e.g., '8Gi'
    cpu: z.string().optional(),         // e.g., '4' or '4000m'
    gpu: z.number().int().optional(),   // e.g., 1
  }).optional(),

  // Image reference (set by build service, optional for premade)
  imageRef: z.string().optional(),

}).refine(
  data => {
    if (data.modelSource === 'premade') {
      return !!data.premadeModel;
    }
    if (data.modelSource === 'huggingface') {
      return !!data.modelId && !!data.ggufFile;
    }
    return false;
  },
  { message: 'Invalid model configuration: premade requires premadeModel, huggingface requires modelId and ggufFile' }
);

export type KaitoDeploymentConfig = z.infer<typeof kaitoDeploymentConfigSchema>;

/**
 * KAITO Workspace manifest schema for validation
 */
export const kaitoWorkspaceSchema = z.object({
  apiVersion: z.literal('kaito.sh/v1beta1'),
  kind: z.literal('Workspace'),
  metadata: z.object({
    name: z.string(),
    namespace: z.string(),
    labels: z.record(z.string()).optional(),
  }),
  spec: z.object({
    resource: z.object({
      labelSelector: z.object({
        matchLabels: z.record(z.string()).optional(),
      }).optional(),
      count: z.number().optional(),
      instanceType: z.string().optional(),
    }).optional(),
    inference: z.object({
      template: z.object({
        spec: z.object({
          containers: z.array(z.object({
            name: z.string(),
            image: z.string(),
            args: z.array(z.string()).optional(),
            ports: z.array(z.object({
              containerPort: z.number(),
              protocol: z.string().optional(),
            })).optional(),
            resources: z.object({
              requests: z.record(z.string()).optional(),
              limits: z.record(z.string()).optional(),
            }).optional(),
          })),
        }),
      }),
    }),
  }),
});

export type KaitoWorkspace = z.infer<typeof kaitoWorkspaceSchema>;
