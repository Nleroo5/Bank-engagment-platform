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
  webpack: (config, { isServer }) => {
    // Fix for @sanity/client browser build
    config.resolve.alias = {
      ...config.resolve.alias,
      '@sanity/eventsource': false,
    };

    // Fix for ExcelJS and server-only packages
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'exceljs': 'commonjs exceljs',
        'archiver': 'commonjs archiver',
      });
    }

    return config;
  },
};

export default nextConfig;
