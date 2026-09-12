/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfjs-dist resolves its worker script relative to import.meta.url
  // at runtime, which Turbopack's server bundling breaks. Leaving the
  // package unbundled (loaded via plain require from node_modules)
  // avoids that entirely.
  serverExternalPackages: ["pdfjs-dist"],
};

module.exports = nextConfig;
