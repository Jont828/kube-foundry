/**
 * Cost Estimation Service Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateResourceBreakdown,
  calculateCostEstimate,
  compareCosts,
  getHourlyRate,
  detectGpuTypeFromMemory,
  formatCurrency,
} from './costEstimation';
import type { CostEstimateInput, CostSettings } from '@kubefoundry/shared';

describe('calculateResourceBreakdown', () => {
  test('calculates aggregated mode resources correctly', () => {
    const input: CostEstimateInput = {
      mode: 'aggregated',
      replicas: 3,
      gpusPerReplica: 4,
    };

    const result = calculateResourceBreakdown(input);

    expect(result.totalGpus).toBe(12); // 3 * 4
    expect(result.totalInstances).toBe(3);
    expect(result.workerInstances).toBe(3);
    expect(result.gpusPerWorker).toBe(4);
  });

  test('calculates disaggregated mode resources correctly', () => {
    const input: CostEstimateInput = {
      mode: 'disaggregated',
      replicas: 1, // not used in disaggregated
      gpusPerReplica: 2,
      prefillReplicas: 2,
      decodeReplicas: 4,
      prefillGpus: 2,
      decodeGpus: 1,
    };

    const result = calculateResourceBreakdown(input);

    expect(result.totalGpus).toBe(8); // (2*2) + (4*1)
    expect(result.totalInstances).toBe(6); // 2 + 4
    expect(result.prefillInstances).toBe(2);
    expect(result.decodeInstances).toBe(4);
    expect(result.prefillGpusPerInstance).toBe(2);
    expect(result.decodeGpusPerInstance).toBe(1);
  });

  test('uses defaults for missing disaggregated values', () => {
    const input: CostEstimateInput = {
      mode: 'disaggregated',
      replicas: 1,
      gpusPerReplica: 2,
      // prefillReplicas and decodeReplicas not provided
    };

    const result = calculateResourceBreakdown(input);

    expect(result.prefillInstances).toBe(1);
    expect(result.decodeInstances).toBe(1);
    expect(result.prefillGpusPerInstance).toBe(2); // falls back to gpusPerReplica
    expect(result.decodeGpusPerInstance).toBe(2);
    expect(result.totalGpus).toBe(4); // (1*2) + (1*2)
  });
});

describe('getHourlyRate', () => {
  test('returns rate for AWS A100-80GB', () => {
    const rate = getHourlyRate('aws', 'nvidia-a100-80gb');
    expect(rate).toBe(4.10);
  });

  test('returns rate for Azure H100', () => {
    const rate = getHourlyRate('azure', 'nvidia-h100');
    expect(rate).toBe(5.00);
  });

  test('returns rate for GCP T4', () => {
    const rate = getHourlyRate('gcp', 'nvidia-t4');
    expect(rate).toBe(0.35);
  });

  test('returns custom rate for on-prem', () => {
    const rate = getHourlyRate('on-prem', 'nvidia-h100', 3.50);
    expect(rate).toBe(3.50);
  });

  test('returns undefined for no provider', () => {
    const rate = getHourlyRate('none', 'nvidia-a100-80gb');
    expect(rate).toBeUndefined();
  });

  test('returns undefined for on-prem without custom rate', () => {
    const rate = getHourlyRate('on-prem', 'nvidia-h100');
    expect(rate).toBeUndefined();
  });
});

describe('calculateCostEstimate', () => {
  test('calculates estimate with AWS pricing', () => {
    const input: CostEstimateInput = {
      mode: 'aggregated',
      replicas: 2,
      gpusPerReplica: 4,
      cloudProvider: 'aws',
      gpuType: 'nvidia-a100-80gb',
    };

    const result = calculateCostEstimate(input);

    expect(result.hasActualCosts).toBe(true);
    expect(result.resources.totalGpus).toBe(8);
    expect(result.hourlyRate).toBe(8 * 4.10); // 32.80
    expect(result.dailyRate).toBe(result.hourlyRate! * 24);
    expect(result.monthlyRate).toBe(result.hourlyRate! * 730);
    expect(result.cloudProvider).toBe('aws');
    expect(result.gpuType).toBe('nvidia-a100-80gb');
  });

  test('calculates estimate without pricing when provider not set', () => {
    const input: CostEstimateInput = {
      mode: 'aggregated',
      replicas: 2,
      gpusPerReplica: 4,
    };

    const result = calculateCostEstimate(input);

    expect(result.hasActualCosts).toBe(false);
    expect(result.resources.totalGpus).toBe(8);
    expect(result.hourlyRate).toBeUndefined();
    expect(result.gpuMultiplier).toBe(2); // 8 GPUs / 4 gpusPerReplica baseline
  });

  test('calculates relative metrics correctly', () => {
    const input: CostEstimateInput = {
      mode: 'disaggregated',
      replicas: 1,
      gpusPerReplica: 2,
      prefillReplicas: 2,
      decodeReplicas: 3,
      prefillGpus: 2,
      decodeGpus: 2,
    };

    const result = calculateCostEstimate(input);

    // Total = (2*2) + (3*2) = 10 GPUs
    // Baseline = 2 GPUs (gpusPerReplica)
    expect(result.resources.totalGpus).toBe(10);
    expect(result.baselineGpus).toBe(2);
    expect(result.additionalGpus).toBe(8);
    expect(result.gpuMultiplier).toBe(5);
    expect(result.percentageIncrease).toBe(400); // (10-2)/2 * 100
  });

  test('uses cost settings when provided', () => {
    const input: CostEstimateInput = {
      mode: 'aggregated',
      replicas: 1,
      gpusPerReplica: 1,
    };

    const settings: CostSettings = {
      cloudProvider: 'azure',
      gpuType: 'nvidia-h100',
    };

    const result = calculateCostEstimate(input, settings);

    expect(result.hasActualCosts).toBe(true);
    expect(result.hourlyRate).toBe(5.00);
  });
});

describe('compareCosts', () => {
  test('compares aggregated and disaggregated configurations', () => {
    const aggregated = {
      mode: 'aggregated' as const,
      replicas: 2,
      gpusPerReplica: 4,
    };

    const disaggregated = {
      mode: 'disaggregated' as const,
      replicas: 1,
      gpusPerReplica: 4,
      prefillReplicas: 2,
      decodeReplicas: 3,
      prefillGpus: 4,
      decodeGpus: 2,
    };

    const result = compareCosts(aggregated, disaggregated);

    expect(result.aggregated.resources.totalGpus).toBe(8); // 2*4
    expect(result.disaggregated.resources.totalGpus).toBe(14); // (2*4)+(3*2)
    expect(result.savingsDescription).toContain('more');
  });
});

describe('detectGpuTypeFromMemory', () => {
  test('detects A100-80GB from 80GB memory', () => {
    expect(detectGpuTypeFromMemory(80)).toBe('nvidia-a100-80gb');
  });

  test('detects H200 from 141GB memory', () => {
    expect(detectGpuTypeFromMemory(141)).toBe('nvidia-h200');
  });

  test('detects T4 from 16GB memory', () => {
    expect(detectGpuTypeFromMemory(16)).toBe('nvidia-t4');
  });

  test('returns unknown for undefined memory', () => {
    expect(detectGpuTypeFromMemory(undefined)).toBe('unknown');
  });
});

describe('formatCurrency', () => {
  test('formats large amounts with k suffix', () => {
    expect(formatCurrency(1500)).toBe('$1.5k');
    expect(formatCurrency(2345)).toBe('$2.3k');
  });

  test('formats medium amounts without decimals', () => {
    expect(formatCurrency(150)).toBe('$150');
    expect(formatCurrency(999)).toBe('$999');
  });

  test('formats small amounts with decimals', () => {
    expect(formatCurrency(1.50)).toBe('$1.50');
    expect(formatCurrency(99.99)).toBe('$99.99');
  });
});
