/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nxxjoelvjlhmgwmqjsjg.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/lms/**',
      },
    ],
  },
}

module.exports = nextConfig 