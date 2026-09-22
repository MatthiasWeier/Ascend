import type { NextConfig } from "next";

// Baseline hardening headers. No CSP here on purpose - this app renders
// inline <style> (components/ui/chart.tsx) and relies on Next's own
// script handling, and getting a CSP wrong silently breaks pages rather
// than failing loudly; add one deliberately later if desired, tested in
// a browser (report-only first), not blind.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Only meaningful once served over HTTPS (true here via the reverse
  // proxy in front of this VM) - tells browsers to never downgrade to
  // plain HTTP for this host again, even for a stale http:// link.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
