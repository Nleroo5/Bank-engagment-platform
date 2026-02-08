/**
 * Professional Rate Limiting Utility
 *
 * Uses in-memory LRU cache with sliding window algorithm
 * Suitable for Vercel serverless environment with single-instance deployments
 *
 * For multi-region/high-traffic production, consider Upstash Redis:
 * https://upstash.com/docs/redis/features/ratelimiting
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class RateLimiter {
  private cache: Map<string, number[]>;
  private readonly maxSize: number = 500; // LRU cache size

  constructor() {
    this.cache = new Map();
  }

  /**
   * Check if a request should be rate limited
   * @param identifier Unique identifier (IP address, user ID, email, etc.)
   * @param config Rate limit configuration
   * @returns Rate limit result with headers data
   */
  check(
    identifier: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.interval;

    // Get or create request timestamps for this identifier
    let timestamps = this.cache.get(identifier) || [];

    // Remove expired timestamps (outside current window)
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    const isAllowed = timestamps.length < config.uniqueTokenPerInterval;

    if (isAllowed) {
      // Add current request timestamp
      timestamps.push(now);
      this.cache.set(identifier, timestamps);

      // Implement LRU cache eviction if cache is too large
      if (this.cache.size > this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
    }

    const remaining = Math.max(0, config.uniqueTokenPerInterval - timestamps.length);
    const firstTimestamp = timestamps[0];
    const reset = firstTimestamp !== undefined
      ? Math.ceil((firstTimestamp + config.interval) / 1000)
      : Math.ceil((now + config.interval) / 1000);

    return {
      success: isAllowed,
      limit: config.uniqueTokenPerInterval,
      remaining,
      reset,
    };
  }

  /**
   * Clear rate limit data for an identifier
   * Useful for testing or manual resets
   */
  clear(identifier: string): void {
    this.cache.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.cache.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different API endpoints
 */
export const RATE_LIMITS = {
  // Survey submission - prevent spam while allowing legitimate retries
  SURVEY_SUBMIT: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  },

  // Email sending - strict limit to prevent abuse
  EMAIL_SEND: {
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 100, // 100 emails per hour per org
  },

  // Authentication - prevent brute force
  AUTH_LOGIN: {
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5, // 5 login attempts per 15 minutes
  },

  // General API - reasonable limits for normal usage
  API_GENERAL: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 requests per minute
  },

  // Response saving - allow frequent saves for user experience
  RESPONSE_SAVE: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 30, // 30 saves per minute
  },
} as const;

/**
 * Apply rate limiting to an API route
 * @param identifier Unique identifier for the rate limit (IP, user ID, etc.)
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return rateLimiter.check(identifier, config);
}

/**
 * Get client IP address from request headers
 * Works with Vercel's proxy headers
 */
export function getClientIp(request: Request): string {
  // Vercel provides the client IP in x-real-ip or x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : 'unknown';
  }

  if (realIp) {
    return realIp;
  }

  // Fallback for local development
  return 'unknown';
}

/**
 * Create rate limit headers for HTTP response
 * Following standard rate limit header format
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

// Export singleton for testing/debugging
export const __rateLimiterInstance = rateLimiter;
