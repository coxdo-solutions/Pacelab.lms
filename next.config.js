/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    turbo: {
      resolveAlias: {
        // Make sure you have ./empty-module.js present at the project root
        canvas: './empty-module.js',
      },
    },
  },

  // Let Next/Image load remote thumbnails (add/remove hosts as needed)
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },            // dev thumbnails
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: '**.supabase.co' },      // Supabase buckets
      { protocol: 'https', hostname: 'images.unsplash.com' }, // Unsplash
      { protocol: 'https', hostname: '**.cloudfront.net' },   // common CDN
      { protocol: 'https', hostname: '**.imgix.net' },        // imgix
      { protocol: 'https', hostname: '**.googleusercontent.com' }, // gusercontent
    ],
    // If you use custom loaders/CDN, you can set `unoptimized: true`
    // unoptimized: true,
  },

  webpack: (config, { dev, isServer }) => {
    // Clear webpack cache on development
    if (dev) config.cache = false;

    // Handle canvas module for server-side rendering
    if (isServer) {
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas');
      } else if (config.externals) {
        config.externals = [config.externals, 'canvas'];
      } else {
        config.externals = ['canvas'];
      }
    }

    // Resolve barrel loader issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },

  // Disable strict mode to prevent timer-related issues in development
  reactStrictMode: false,

  // Add timeout configurations
  serverRuntimeConfig: {
    timeout: 60000,
  },
  publicRuntimeConfig: {
    timeout: 30000,
  },
};

module.exports = nextConfig;
