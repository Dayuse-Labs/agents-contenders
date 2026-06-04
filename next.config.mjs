/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false, // ne pas exposer le code source en prod
  poweredByHeader: false,
};

export default nextConfig;
