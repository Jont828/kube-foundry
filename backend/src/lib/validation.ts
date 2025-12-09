import { z } from 'zod';

/**
 * Kubernetes namespace naming rules:
 * - Must be 63 characters or less
 * - Must start and end with alphanumeric
 * - Can contain lowercase alphanumeric and hyphens
 */
export const namespaceSchema = z
  .string()
  .min(1, 'Namespace cannot be empty')
  .max(63, 'Namespace must be 63 characters or less')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Namespace must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric'
  );

/**
 * Kubernetes resource name rules:
 * - Must be 253 characters or less
 * - Must start and end with alphanumeric
 * - Can contain lowercase alphanumeric, hyphens, and dots
 */
export const resourceNameSchema = z
  .string()
  .min(1, 'Name cannot be empty')
  .max(253, 'Name must be 253 characters or less')
  .regex(
    /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/,
    'Name must be lowercase alphanumeric with hyphens/dots, starting and ending with alphanumeric'
  );
