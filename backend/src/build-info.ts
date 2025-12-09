/**
 * Build-time constants injected via Bun's --define flag
 * These values are replaced at compile time with actual values
 * 
 * In development mode, defaults are used
 */

// Declare global constants that will be injected at build time
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __GIT_COMMIT__: string;

// Export build info with fallbacks for development
export const BUILD_INFO = {
  /** Version from package.json or git tag (e.g., "v1.0.0") */
  version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'dev',
  
  /** ISO timestamp when the binary was built */
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
  
  /** Short git commit hash */
  gitCommit: typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'unknown',
};

export type BuildInfo = typeof BUILD_INFO;
