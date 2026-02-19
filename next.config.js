/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    serverComponentsExternalPackages: ["pdfkit", "sharp"],
  },
};

module.exports = nextConfig;
