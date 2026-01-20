// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "trikona-bucket.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
    
};

module.exports = nextConfig;