/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@medilink/shared-types', '@medilink/validation'],
};

module.exports = nextConfig;
