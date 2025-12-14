/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Pass existing environment variables to the client side
    API_KEY: process.env.API_KEY || process.env.GEMINI_API_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/ollama-proxy/:path*',
        destination: 'https://ollama.com/:path*',
      },
    ];
  },
};

export default nextConfig;