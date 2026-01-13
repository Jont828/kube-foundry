/**
 * Integrations Page
 *
 * Configure external integrations like NVIDIA GPU Operator and HuggingFace.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SectionBox,
  Loader,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useApiClient } from '../lib/api-client';
import { getHuggingFaceCallbackUrl } from '../routes';
import type { GPUOperatorStatus, HfSecretStatus } from '@kubefoundry/shared';
import { ConnectionError } from '../components/ConnectionBanner';

/**
 * Inline loading spinner for use inside sections (simpler than the full-page Loader)
 */
function InlineLoader() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
}

export function Integrations() {
  const api = useApiClient();

  // GPU Operator state
  const [gpuStatus, setGpuStatus] = useState<GPUOperatorStatus | null>(null);
  const [gpuLoading, setGpuLoading] = useState(true);
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  // HuggingFace state
  const [hfStatus, setHfStatus] = useState<HfSecretStatus | null>(null);
  const [hfLoading, setHfLoading] = useState(true);
  const [hfError, setHfError] = useState<string | null>(null);
  const [connectingHf, setConnectingHf] = useState(false);
  const [disconnectingHf, setDisconnectingHf] = useState(false);

  // Fetch GPU Operator status
  const fetchGpuStatus = useCallback(async () => {
    setGpuLoading(true);
    setGpuError(null);

    try {
      const result = await api.gpuOperator.getStatus();
      setGpuStatus(result);
    } catch (err) {
      setGpuError(err instanceof Error ? err.message : 'Failed to fetch GPU status');
    } finally {
      setGpuLoading(false);
    }
  }, [api]);

  // Fetch HuggingFace status
  const fetchHfStatus = useCallback(async () => {
    setHfLoading(true);
    setHfError(null);

    try {
      const result = await api.huggingFace.getSecretStatus();
      setHfStatus(result);
    } catch (err) {
      setHfError(err instanceof Error ? err.message : 'Failed to fetch HuggingFace status');
    } finally {
      setHfLoading(false);
    }
  }, [api]);

  // Install GPU Operator
  const handleInstallGpu = useCallback(async () => {
    setInstalling(true);

    try {
      const result = await api.gpuOperator.install();
      if (result.success) {
        await fetchGpuStatus();
      } else {
        alert(`Installation failed: ${result.message}`);
      }
    } catch (err) {
      alert(`Failed to install GPU Operator: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setInstalling(false);
    }
  }, [api, fetchGpuStatus]);

  // Start HuggingFace OAuth flow
  // Uses backend-driven PKCE flow to work across different frontend origins
  const handleConnectHf = useCallback(async () => {
    setConnectingHf(true);

    try {
      // Get the callback URL for this environment (uses current origin)
      const redirectUri = getHuggingFaceCallbackUrl();

      // Start OAuth via backend - it generates PKCE and stores the verifier
      const { authorizationUrl, state } = await api.huggingFace.startOAuth({ redirectUri });

      // Store state so the callback can validate it
      sessionStorage.setItem('hf_oauth_state', state);
      sessionStorage.setItem('hf_oauth_from_headlamp', 'true');

      // Redirect to HuggingFace authorization
      window.location.href = authorizationUrl;
    } catch (err) {
      alert(`Failed to start OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectingHf(false);
    }
  }, [api]);

  // Disconnect HuggingFace
  const handleDisconnectHf = useCallback(async () => {
    setDisconnectingHf(true);

    try {
      await api.huggingFace.deleteSecret();
      await fetchHfStatus();
    } catch (err) {
      alert(`Failed to disconnect: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDisconnectingHf(false);
    }
  }, [api, fetchHfStatus]);

  // Copy command to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    // Could show a notification here
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGpuStatus();
    fetchHfStatus();
  }, [fetchGpuStatus, fetchHfStatus]);

  const loading = gpuLoading && hfLoading;

  if (loading) {
    return <Loader title="Loading integrations..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* NVIDIA GPU Operator */}
      <SectionBox title="NVIDIA GPU Operator">
        <div style={{ padding: '16px 0' }}>
          <p style={{ margin: '0 0 16px', opacity: 0.7 }}>
            Install the NVIDIA GPU Operator to enable GPU support in your cluster
          </p>

          {gpuError ? (
            <ConnectionError error={gpuError} onRetry={fetchGpuStatus} />
          ) : gpuLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <InlineLoader />
              <span>Checking GPU Operator status...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>Status</span>
                <StatusLabel status={gpuStatus?.installed ? 'success' : 'error'}>
                  {gpuStatus?.installed ? 'Installed' : 'Not Installed'}
                </StatusLabel>
              </div>

              {gpuStatus?.installed && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>Operator Running</span>
                    <StatusLabel status={gpuStatus?.operatorRunning ? 'success' : 'error'}>
                      {gpuStatus?.operatorRunning ? 'Yes' : 'No'}
                    </StatusLabel>
                  </div>

                  {gpuStatus?.gpusAvailable && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Total GPUs</span>
                      <span style={{ fontFamily: 'monospace' }}>{gpuStatus.totalGPUs}</span>
                    </div>
                  )}
                </>
              )}

              {/* Install toggle or button */}
              {!gpuStatus?.installed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>Enable GPU Operator</div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        Automatically installs the NVIDIA GPU Operator via Helm
                      </div>
                    </div>
                    <button
                      onClick={handleInstallGpu}
                      disabled={installing}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: installing ? 'wait' : 'pointer',
                        opacity: installing ? 0.7 : 1,
                      }}
                    >
                      {installing ? 'Installing...' : 'Install'}
                    </button>
                  </div>

                  {installing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                      <InlineLoader />
                      <span>Installing GPU Operator... This may take several minutes.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Manual installation commands */}
              {gpuStatus?.helmCommands && gpuStatus.helmCommands.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontWeight: 500, marginBottom: '12px' }}>Manual Installation</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {gpuStatus.helmCommands.map((cmd, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <code
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            backgroundColor: 'rgba(128, 128, 128, 0.1)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                          }}
                        >
                          {cmd}
                        </code>
                        <button
                          onClick={() => copyToClipboard(cmd)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(128, 128, 128, 0.3)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'inherit',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionBox>

      {/* HuggingFace Token */}
      <SectionBox title="HuggingFace Token">
        <div style={{ padding: '16px 0' }}>
          <p style={{ margin: '0 0 16px', opacity: 0.7 }}>
            Connect your HuggingFace account to access gated models like Llama
          </p>

          {hfError ? (
            <ConnectionError error={hfError} onRetry={fetchHfStatus} />
          ) : hfLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <InlineLoader />
              <span>Checking HuggingFace connection...</span>
            </div>
          ) : hfStatus?.configured ? (
            // Connected state
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hfStatus.user?.avatarUrl ? (
                    <img
                      src={hfStatus.user.avatarUrl}
                      alt={hfStatus.user.name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(128, 128, 128, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      🔑
                    </div>
                  )}
                  <div>
                    {hfStatus.user ? (
                      <>
                        <div style={{ fontWeight: 500 }}>
                          {hfStatus.user.fullname || hfStatus.user.name}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7 }}>
                          @{hfStatus.user.name}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 500 }}>HuggingFace Token</div>
                        <div style={{ fontSize: '13px', opacity: 0.7 }}>Token configured</div>
                      </>
                    )}
                  </div>
                </div>
                <StatusLabel status="success">Connected</StatusLabel>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#4caf50',
                }}
              >
                <span>✓</span>
                <span>
                  Token saved in {hfStatus.namespaces.filter((n) => n.exists).length} namespace(s)
                </span>
              </div>

              <button
                onClick={handleDisconnectHf}
                disabled={disconnectingHf}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(128, 128, 128, 0.3)',
                  borderRadius: '4px',
                  cursor: disconnectingHf ? 'wait' : 'pointer',
                  color: 'inherit',
                  alignSelf: 'flex-start',
                }}
              >
                {disconnectingHf ? 'Disconnecting...' : 'Disconnect HuggingFace'}
              </button>
            </div>
          ) : (
            // Not connected state
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Sign in with HuggingFace to automatically configure your token for accessing gated
                models. The token will be securely stored as a Kubernetes secret.
              </p>

              <button
                onClick={handleConnectHf}
                disabled={connectingHf}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#FFD21E',
                  color: 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: connectingHf ? 'wait' : 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  alignSelf: 'flex-start',
                }}
              >
                {connectingHf ? (
                  'Connecting...'
                ) : (
                  <>
                    <span>🤗</span>
                    Sign in with Hugging Face
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </SectionBox>
    </div>
  );
}
