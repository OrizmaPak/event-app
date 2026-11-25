import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the local Codex browser to load Next's development assets from 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
