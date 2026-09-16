import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   output: "standalone",
   basePath: "/amortization",
   reactStrictMode: true,
   images: {
      qualities: [75, 100],
   },
};

export default nextConfig;
