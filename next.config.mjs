/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    // Fix for @sanity/client browser build
    config.resolve.alias = {
      ...config.resolve.alias,
      '@sanity/eventsource': false,
    };
    return config;
  },
};

export default nextConfig;
