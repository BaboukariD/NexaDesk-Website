/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfjs-dist resolves its worker script relative to import.meta.url
  // at runtime, which Turbopack's server bundling breaks. Leaving the
  // package unbundled (loaded via plain require from node_modules)
  // avoids that entirely.
  serverExternalPackages: ["pdfjs-dist"],
  // serverExternalPackages keeps pdfjs-dist out of the bundle, but
  // Vercel's deploy only ships whatever @vercel/nft actually traced —
  // and pdf.worker.mjs is loaded by pdfjs-dist itself at runtime, not
  // via a static import our code makes, so the tracer never finds it.
  // Confirmed by inspecting .next/server/app/api/upload/parse/route.js.nft.json
  // directly: pdf.mjs was listed, pdf.worker.mjs was not — which is
  // exactly the file production failed to find. Force it in.
  outputFileTracingIncludes: {
    "/api/upload/parse": ["./node_modules/pdfjs-dist/legacy/build/**/*"],
  },
};

module.exports = nextConfig;
