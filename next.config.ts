import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Transpile packages that don't ship ESM
    transpilePackages: ["react-big-calendar"],
};

export default nextConfig;
