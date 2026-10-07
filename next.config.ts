import type { NextConfig } from 'next';

// Photos uploaded to the CMS are served from Supabase Storage.
const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtusjzvbkuwktjxammda.supabase.co');
const localStorage = ['localhost', '127.0.0.1'].includes(storage.hostname);

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: storage.protocol.replace(':', '') as 'http' | 'https',
        hostname: storage.hostname,
        ...(storage.port ? { port: storage.port } : {}),
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Only for a local Supabase in development and tests.
    ...(localStorage ? { dangerouslyAllowLocalIP: true } : {}),
  },
  poweredByHeader: false,
};

export default nextConfig;
