import type { OpenClawConfig } from "../config/config.js";
import { hasConfiguredSecretInput } from "../config/types.secrets.js";

export const EXPLICIT_GATEWAY_AUTH_MODE_REQUIRED_ERROR =
  "Invalid config: gateway.auth.token and gateway.auth.password are both configured, but gateway.auth.mode is unset. Set gateway.auth.mode to token or password.";

export const GATEWAY_AUTH_MODE_NONE_FORBIDDEN_ERROR =
  "Invalid config: gateway.auth.mode is set to 'none', which disables all authentication. " +
  "This is not permitted unless OPENCLAW_ALLOW_AUTH_NONE=1 is explicitly set in the environment. " +
  "If you understand the risk, set OPENCLAW_ALLOW_AUTH_NONE=1 before starting the gateway.";

export function hasAmbiguousGatewayAuthModeConfig(cfg: OpenClawConfig): boolean {
  const auth = cfg.gateway?.auth;
  if (!auth) {
    return false;
  }
  if (typeof auth.mode === "string" && auth.mode.trim().length > 0) {
    return false;
  }
  const defaults = cfg.secrets?.defaults;
  const tokenConfigured = hasConfiguredSecretInput(auth.token, defaults);
  const passwordConfigured = hasConfiguredSecretInput(auth.password, defaults);
  return tokenConfigured && passwordConfigured;
}

export function assertExplicitGatewayAuthModeWhenBothConfigured(cfg: OpenClawConfig): void {
  if (!hasAmbiguousGatewayAuthModeConfig(cfg)) {
    return;
  }
  throw new Error(EXPLICIT_GATEWAY_AUTH_MODE_REQUIRED_ERROR);
}

/**
 * Blocks gateway.auth.mode = 'none' at config validation time unless the operator
 * has explicitly opted in via OPENCLAW_ALLOW_AUTH_NONE=1.
 *
 * This prevents silent misconfiguration from opening the gateway to unauthenticated
 * access, which is the root cause pattern behind CVE-2026-25253 and CVE-2026-25593.
 */
export function assertGatewayAuthModeNoneNotForbidden(cfg: OpenClawConfig): void {
  if (cfg.gateway?.auth?.mode !== "none") {
    return;
  }
  if (process.env.OPENCLAW_ALLOW_AUTH_NONE === "1") {
    return;
  }
  throw new Error(GATEWAY_AUTH_MODE_NONE_FORBIDDEN_ERROR);
}
