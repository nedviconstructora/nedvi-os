// Shared server-only release metadata for web and installed PWA clients.
// Production origin is supplied by Vercel; never point users to an immutable preview deployment.
export function currentReleaseInfo() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.VERCEL_URL ||
    'development'
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    'nedvi-os.vercel.app'
  // Only expose a syntactically valid host, with no credentials, path or query.
  const productionUrl = /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null
  return { version, productionUrl }
}
