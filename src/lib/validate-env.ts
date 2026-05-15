/**
 * Environment Variable Validator
 * Ensures the app fails fast if required secrets are missing.
 */
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  ];

  const serverOnly = [
    'PAYSTACK_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'BUNDLECORNER_API_KEY',
    'BUNDLECORNER_WEBHOOK_SECRET',
  ];

  const missing = [];

  // Check Public Keys (available everywhere)
  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  // Check Server Secrets (only in Node.js environment)
  if (typeof window === 'undefined') {
    for (const key of serverOnly) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `CRITICAL CONFIG ERROR: Missing environment variables: ${missing.join(', ')}`;
    console.error(errorMsg);
    
    // In production server-side, we should throw to prevent broken startup
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  }
}
