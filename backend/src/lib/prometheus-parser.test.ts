import { describe, it, expect } from 'bun:test';
import {
  parsePrometheusText,
  findMetric,
  findAllMetrics,
  getHistogramSum,
  getHistogramCount,
  calculateHistogramAverage,
  sumMetricValues,
} from './prometheus-parser';

describe('parsePrometheusText', () => {
  it('parses simple gauge metrics', () => {
    const text = `
vllm:num_requests_running 5
vllm:num_requests_waiting 12
`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(2);
    expect(metrics[0]).toEqual({
      name: 'vllm:num_requests_running',
      value: 5,
      labels: {},
    });
    expect(metrics[1]).toEqual({
      name: 'vllm:num_requests_waiting',
      value: 12,
      labels: {},
    });
  });

  it('parses metrics with labels', () => {
    const text = `vllm:gpu_cache_usage_perc{model="llama",replica="0"} 0.73`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toEqual({
      name: 'vllm:gpu_cache_usage_perc',
      value: 0.73,
      labels: { model: 'llama', replica: '0' },
    });
  });

  it('parses counter metrics with _total suffix', () => {
    const text = `
vllm:request_success_total 1234
ray_serve_deployment_request_counter_total{deployment="llm"} 5678
`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(2);
    expect(metrics[0].name).toBe('vllm:request_success_total');
    expect(metrics[0].value).toBe(1234);
    expect(metrics[1].name).toBe('ray_serve_deployment_request_counter_total');
    expect(metrics[1].value).toBe(5678);
  });

  it('parses histogram metrics with _sum and _count', () => {
    const text = `
vllm:e2e_request_latency_seconds_sum 567.8
vllm:e2e_request_latency_seconds_count 100
vllm:e2e_request_latency_seconds_bucket{le="0.5"} 50
vllm:e2e_request_latency_seconds_bucket{le="1.0"} 80
vllm:e2e_request_latency_seconds_bucket{le="+Inf"} 100
`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(5);
    expect(findMetric(metrics, 'vllm:e2e_request_latency_seconds_sum')?.value).toBe(567.8);
    expect(findMetric(metrics, 'vllm:e2e_request_latency_seconds_count')?.value).toBe(100);
  });

  it('skips comment lines (HELP, TYPE)', () => {
    const text = `
# HELP vllm:num_requests_running Number of requests currently running
# TYPE vllm:num_requests_running gauge
vllm:num_requests_running 5
# HELP vllm:request_success_total Total successful requests
# TYPE vllm:request_success_total counter
vllm:request_success_total 100
`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(2);
    expect(metrics[0].name).toBe('vllm:num_requests_running');
    expect(metrics[1].name).toBe('vllm:request_success_total');
  });

  it('skips empty lines', () => {
    const text = `
vllm:num_requests_running 5

vllm:num_requests_waiting 10

`;
    const metrics = parsePrometheusText(text);
    expect(metrics).toHaveLength(2);
  });

  it('parses floating point values', () => {
    const text = `vllm:gpu_cache_usage_perc 0.735`;
    const metrics = parsePrometheusText(text);

    expect(metrics[0].value).toBe(0.735);
  });

  it('parses scientific notation', () => {
    const text = `large_value 1.5e6`;
    const metrics = parsePrometheusText(text);

    expect(metrics[0].value).toBe(1500000);
  });

  it('parses negative values', () => {
    const text = `negative_metric -42.5`;
    const metrics = parsePrometheusText(text);

    expect(metrics[0].value).toBe(-42.5);
  });

  it('skips NaN and Inf values', () => {
    const text = `
valid_metric 100
nan_metric NaN
inf_metric Inf
another_valid 200
`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(2);
    expect(metrics[0].name).toBe('valid_metric');
    expect(metrics[1].name).toBe('another_valid');
  });

  it('handles metrics with timestamps (ignores timestamp)', () => {
    const text = `http_requests_total 1234 1609459200000`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(1234);
  });

  it('parses Ray Serve metrics', () => {
    const text = `
ray_serve_deployment_request_counter_total{deployment="llm_app",replica="abc123",route="/",application="default"} 500
ray_serve_deployment_processing_latency_ms_sum{deployment="llm_app"} 12500.5
ray_serve_deployment_processing_latency_ms_count{deployment="llm_app"} 500
ray_serve_replica_processing_queries{deployment="llm_app",replica="abc123"} 3
`;
    const metrics = parsePrometheusText(text);

    expect(metrics).toHaveLength(4);
    expect(findMetric(metrics, 'ray_serve_deployment_request_counter_total')?.value).toBe(500);
    expect(findMetric(metrics, 'ray_serve_replica_processing_queries')?.value).toBe(3);
  });
});

describe('findMetric', () => {
  it('finds metric by name', () => {
    const metrics = parsePrometheusText(`
metric_a 10
metric_b 20
metric_c 30
`);
    expect(findMetric(metrics, 'metric_b')?.value).toBe(20);
  });

  it('returns undefined for non-existent metric', () => {
    const metrics = parsePrometheusText(`metric_a 10`);
    expect(findMetric(metrics, 'metric_b')).toBeUndefined();
  });

  it('returns first match when multiple exist', () => {
    const metrics = parsePrometheusText(`
metric_a{label="first"} 10
metric_a{label="second"} 20
`);
    expect(findMetric(metrics, 'metric_a')?.value).toBe(10);
  });
});

describe('findAllMetrics', () => {
  it('finds all metrics with same name', () => {
    const metrics = parsePrometheusText(`
metric_a{label="first"} 10
metric_a{label="second"} 20
metric_b 30
metric_a{label="third"} 30
`);
    const found = findAllMetrics(metrics, 'metric_a');
    expect(found).toHaveLength(3);
  });

  it('returns empty array for non-existent metric', () => {
    const metrics = parsePrometheusText(`metric_a 10`);
    expect(findAllMetrics(metrics, 'metric_b')).toHaveLength(0);
  });
});

describe('histogram utilities', () => {
  const histogramText = `
vllm:e2e_request_latency_seconds_sum 500.0
vllm:e2e_request_latency_seconds_count 100
`;

  it('getHistogramSum returns sum value', () => {
    const metrics = parsePrometheusText(histogramText);
    expect(getHistogramSum(metrics, 'vllm:e2e_request_latency_seconds')).toBe(500.0);
  });

  it('getHistogramCount returns count value', () => {
    const metrics = parsePrometheusText(histogramText);
    expect(getHistogramCount(metrics, 'vllm:e2e_request_latency_seconds')).toBe(100);
  });

  it('calculateHistogramAverage returns average', () => {
    const metrics = parsePrometheusText(histogramText);
    expect(calculateHistogramAverage(metrics, 'vllm:e2e_request_latency_seconds')).toBe(5.0);
  });

  it('calculateHistogramAverage returns undefined for missing metrics', () => {
    const metrics = parsePrometheusText(`some_other_metric 10`);
    expect(calculateHistogramAverage(metrics, 'vllm:e2e_request_latency_seconds')).toBeUndefined();
  });

  it('calculateHistogramAverage returns undefined when count is 0', () => {
    const metrics = parsePrometheusText(`
vllm:e2e_request_latency_seconds_sum 0
vllm:e2e_request_latency_seconds_count 0
`);
    expect(calculateHistogramAverage(metrics, 'vllm:e2e_request_latency_seconds')).toBeUndefined();
  });
});

describe('sumMetricValues', () => {
  it('sums values across different label combinations', () => {
    const metrics = parsePrometheusText(`
requests_total{endpoint="/api/v1"} 100
requests_total{endpoint="/api/v2"} 200
requests_total{endpoint="/health"} 50
`);
    expect(sumMetricValues(metrics, 'requests_total')).toBe(350);
  });

  it('returns 0 for non-existent metric', () => {
    const metrics = parsePrometheusText(`some_metric 10`);
    expect(sumMetricValues(metrics, 'other_metric')).toBe(0);
  });
});
