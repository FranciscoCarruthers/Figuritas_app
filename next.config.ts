import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: config => {
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      crypto: false,
      fs: false,
      path: false,
    }
    return config
  },
}

export default nextConfig
