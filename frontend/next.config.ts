import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/usuarios',
        permanent: true,
      },
    ]
  }
}

export default nextConfig;
