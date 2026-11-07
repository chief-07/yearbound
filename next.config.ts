import dns from "node:dns";
import os from "node:os";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import type { NextConfig } from "next";

// Dynamically discover all IPv4 interfaces on host
const detectedIps: string[] = [];
try {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === "IPv4") {
          detectedIps.push(alias.address);
          detectedIps.push(`${alias.address}:3000`);
        }
      }
    }
  }
} catch {
  // fallback if networkInterfaces fails
}

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@mysten-incubation/memwal', '@mysten/seal'],
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    ...detectedIps,
    '10.105.125.175',
    '10.105.125.175:3000',
    '10.82.149.175',
    '10.82.149.175:3000',
    '10.85.31.175',
    '10.85.31.175:3000',
    '10.99.21.175',
    '10.99.21.175:3000',
    '10.176.217.175',
    '10.109.171.175',
    '10.33.118.175',
    '10.33.118.175:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '*.trycloudflare.com',
  ],
  images: {
    qualities: [75, 95],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
