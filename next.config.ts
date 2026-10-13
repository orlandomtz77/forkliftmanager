import type { NextConfig } from "next";

// cacheComponents is intentionally disabled: every operational page reads the
// user session and per-user data, so routes are rendered dynamically.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
