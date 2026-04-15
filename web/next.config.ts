import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: {
    tracingRoot: path.join(__dirname, ".."),
  },
};

export default nextConfig;
