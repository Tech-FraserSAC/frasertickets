/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['storage.googleapis.com', 'lh3.googleusercontent.com']
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/admin/tickets'
      }
    ]
  }
}

module.exports = nextConfig
