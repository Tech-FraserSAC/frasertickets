/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['storage.googleapis.com', 'lh3.googleusercontent.com']
  }
}

module.exports = nextConfig
