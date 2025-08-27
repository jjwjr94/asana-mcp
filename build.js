import { build } from 'esbuild';
import { readFileSync } from 'fs';

async function main() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

  // Build the main MCP server
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/index.js',
    define: {
      __VERSION__: JSON.stringify(pkg.version),
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    banner: {
      js: `// Asana MCP Server v${pkg.version}\n`
    },
    external: [
      // Node.js built-in modules that should not be bundled
      'url',
      'http',
      'https',
      'stream',
      'zlib',
      'util',
      'events',
      'buffer',
      'querystring',
      'asana',
      'jsdom',
    ]
  });

  // Build the HTTP server
  await build({
    entryPoints: ['index-http.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/index-http.js',
    define: {
      __VERSION__: JSON.stringify(pkg.version),
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    banner: {
      js: `// Asana MCP HTTP Server v${pkg.version}\n`
    },
    external: [
      // Node.js built-in modules that should not be bundled
      'url',
      'http',
      'https',
      'stream',
      'zlib',
      'util',
      'events',
      'buffer',
      'querystring',
      'asana',
      'express',
      'cors',
      'helmet'
    ]
  });
}

main().catch(console.error);
