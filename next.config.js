// ── Fix ConnectTimeoutError on Windows ──────────────────────────────────────
// Node.js built-in fetch() uses undici internally. Undici has its OWN DNS
// resolver that ignores dns.setDefaultResultOrder(). On Windows, if IPv6
// isn't routable, undici hangs for 10s trying IPv6 before falling back.
//
// The ONLY reliable fix: setGlobalDispatcher with family:4 at process start.
// This forces EVERY fetch() in the entire process (middleware, API routes,
// admin client) to connect via IPv4 at the TCP socket level.
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first"); // covers non-fetch DNS lookups

const { Agent, setGlobalDispatcher } = require("undici");
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling undici — it must run as a native Node module
  // so the TCP socket family:4 option works correctly.
  serverExternalPackages: ["undici"],
};

module.exports = nextConfig;
