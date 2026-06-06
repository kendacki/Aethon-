/**
 * Shared Railway runtime detection — used by railway-start.cjs and migrate preDeploy.
 * Prefer service identity over a mis-set AETHON_RUNTIME on the API service.
 */
function resolveRuntime(env = process.env) {
  const serviceName = (env.RAILWAY_SERVICE_NAME ?? "").toLowerCase();
  const publicDomain = (env.RAILWAY_PUBLIC_DOMAIN ?? "").toLowerCase();

  if (serviceName.includes("agent")) {
    return "agent";
  }

  if (serviceName || publicDomain) {
    return "api";
  }

  return (env.AETHON_RUNTIME ?? "api").toLowerCase() === "agent" ? "agent" : "api";
}

module.exports = { resolveRuntime };
