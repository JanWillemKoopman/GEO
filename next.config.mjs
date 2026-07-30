/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions / routes mogen de externe crawler-fetch + OpenAI-calls draaien.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
