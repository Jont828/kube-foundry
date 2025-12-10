import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Focus the first invalid/error element in a form
 * Useful for form validation UX - auto-scrolls and focuses the first error
 */
export function focusFirstError(containerRef?: React.RefObject<HTMLElement | null>): boolean {
  const container = containerRef?.current || document
  
  // Look for elements with aria-invalid or data-error attribute
  const errorElement = container.querySelector<HTMLElement>(
    '[aria-invalid="true"], [data-error="true"], .error, input:invalid, select:invalid, textarea:invalid'
  )
  
  if (errorElement) {
    // Scroll into view with smooth behavior
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    // Focus after scroll animation
    setTimeout(() => {
      errorElement.focus({ preventScroll: true })
    }, 100)
    
    return true
  }
  
  return false
}

/**
 * Animation class presets for consistent motion design
 */
export const animations = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  shake: 'animate-shake',
  shimmer: 'animate-shimmer',
  pulseSoft: 'animate-pulse-soft',
} as const

/**
 * Timing presets for transitions (use with Tailwind classes)
 */
export const timings = {
  fast: 'duration-fast',
  normal: 'duration-normal', 
  slow: 'duration-slow',
  easeOutExpo: 'ease-out-expo',
  easeOutQuart: 'ease-out-quart',
  spring: 'ease-spring',
} as const

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function generateDeploymentName(modelId: string): string {
  const baseName = modelId
    .split('/').pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'deployment'

  const suffix = Math.random().toString(36).substring(2, 6)
  return `${baseName}-${suffix}`
}

/**
 * Ayna deep link configuration (unified flow)
 * URL Pattern: ayna://chat?model={model}&prompt={message}&system={system}&provider={provider}&endpoint={url}&key={apikey}&type={type}
 */
export interface AynaOptions {
  // Chat parameters
  model?: string
  prompt?: string
  system?: string
  // Model setup parameters
  provider?: 'openai' | 'azure' | 'github' | 'aikit'
  endpoint?: string
  key?: string
  type?: 'chat' | 'responses' | 'image'
}

/**
 * Generate an Ayna deep link URL (unified flow for chat + model setup)
 * URL Pattern: ayna://chat?model={model}&prompt={message}&system={system}&provider={provider}&endpoint={url}&key={apikey}&type={type}
 */
export function generateAynaUrl(options: AynaOptions = {}): string {
  const params = new URLSearchParams()
  if (options.model) params.set('model', options.model)
  if (options.prompt) params.set('prompt', options.prompt)
  if (options.system) params.set('system', options.system)
  if (options.provider) params.set('provider', options.provider)
  if (options.endpoint) params.set('endpoint', options.endpoint)
  if (options.key) params.set('key', options.key)
  if (options.type) params.set('type', options.type)
  
  const queryString = params.toString()
  return `ayna://chat${queryString ? `?${queryString}` : ''}`
}
