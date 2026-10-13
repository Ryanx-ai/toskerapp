import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/location-sharing": ["./public/geography/sg-ura-mp2019-regions.geojson"],
    "/api/trips/*/area": ["./public/geography/sg-ura-mp2019-regions.geojson"],
  },
};

export default nextConfig;
