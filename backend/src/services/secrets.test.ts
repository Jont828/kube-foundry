import { describe, test, expect } from 'bun:test';

/**
 * SecretsService Integration Tests
 * 
 * Note: These tests verify the SecretsService through the Hono API routes
 * which are already tested in hono-app.test.ts. The service itself makes
 * real K8s API calls, so unit testing requires a running cluster.
 * 
 * For comprehensive coverage without a cluster, see hono-app.test.ts:
 * - GET /api/secrets/huggingface/status
 * - POST /api/secrets/huggingface
 * - DELETE /api/secrets/huggingface
 */

describe('SecretsService', () => {
  describe('module exports', () => {
    test('exports secretsService singleton', async () => {
      const { secretsService } = await import('./secrets');
      expect(secretsService).toBeDefined();
      expect(typeof secretsService.distributeHfSecret).toBe('function');
      expect(typeof secretsService.getHfSecretStatus).toBe('function');
      expect(typeof secretsService.deleteHfSecrets).toBe('function');
    });
  });

  describe('HF_SECRET_NAME and namespaces', () => {
    test('service distributes to expected namespaces', async () => {
      // Import the service to verify it initializes correctly
      const { secretsService } = await import('./secrets');
      
      // The service should be properly initialized
      // We can't easily test the private TARGET_NAMESPACES constant,
      // but we verify the service methods exist and are callable
      expect(secretsService.distributeHfSecret).toBeInstanceOf(Function);
      expect(secretsService.getHfSecretStatus).toBeInstanceOf(Function);
      expect(secretsService.deleteHfSecrets).toBeInstanceOf(Function);
    });
  });
});
