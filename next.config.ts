import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdf.js optionally requires node-canvas; we only run it in the browser.
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
