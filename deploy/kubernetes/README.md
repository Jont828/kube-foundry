# KubeFoundry Kubernetes Deployment

This directory contains Kubernetes manifests for deploying KubeFoundry to a cluster.

## Quick Start

```bash
# Deploy using kubectl
kubectl apply -f kubefoundry.yaml
```

## Access KubeFoundry

After deployment, access KubeFoundry using port-forward:

```bash
kubectl port-forward -n kubefoundry-system svc/kubefoundry 3001:80
```

Then open http://localhost:3001 in your browser.

## What's Included

| Resource | Description |
|----------|-------------|
| `Namespace` | `kubefoundry-system` - dedicated namespace |
| `ServiceAccount` | Service account for KubeFoundry pod |
| `ClusterRole` | RBAC permissions for K8s and CRD access |
| `ClusterRoleBinding` | Binds role to service account |
| `Deployment` | KubeFoundry server deployment |
| `Service` | ClusterIP service on port 80 |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `AUTH_ENABLED` | `false` | Enable authentication |

### Enable Authentication

Uncomment the `AUTH_ENABLED` environment variable in the deployment:

```yaml
env:
  - name: AUTH_ENABLED
    value: "true"
```

## Verify Deployment

```bash
# Check pods
kubectl get pods -n kubefoundry-system

# Check service
kubectl get svc -n kubefoundry-system

# View logs
kubectl logs -n kubefoundry-system -l app.kubernetes.io/name=kubefoundry -f

# Test health endpoint
kubectl exec -it -n kubefoundry-system deploy/kubefoundry -- curl localhost:3001/api/health
```

## Uninstall

```bash
kubectl delete -f kubefoundry.yaml
```

## Metrics Feature

Once deployed in-cluster, KubeFoundry can fetch real-time metrics from inference deployments (vLLM, Ray Serve). This feature requires in-cluster deployment as it uses Kubernetes service DNS to reach metrics endpoints.
