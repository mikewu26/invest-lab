import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
};

const withMDX = createMDX({
  options: {
    // 字串形式才能在 Turbopack 下使用
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
