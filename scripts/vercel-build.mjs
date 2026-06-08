import { cpSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, ".vercel/output");

mkdirSync(`${out}/static`, { recursive: true });
mkdirSync(`${out}/functions/ssr.func`, { recursive: true });

// 1. Static assets do cliente
cpSync(`${root}/dist/client`, `${out}/static`, { recursive: true });

// 2. Entry temporário que adapta o fetch handler para Node.js HTTP
const entryPath = resolve(root, ".vercel-entry.mjs");
writeFileSync(
  entryPath,
  `import server from './dist/server/server.js';

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = \`\${proto}://\${host}\${req.url}\`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise(r => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => r(Buffer.concat(chunks)));
    });
  }

  const request = new Request(url, { method: req.method, headers, body });
  const response = await server.fetch(request, {}, {});

  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  const buf = await response.arrayBuffer();
  res.end(Buffer.from(buf));
}
`
);

// 3. Bundle tudo em um único arquivo ESM autocontido via esbuild
console.log("Bundling SSR handler com esbuild...");
execSync(
  [
    `npx esbuild`,
    `"${entryPath}"`,
    `--bundle`,
    `--format=esm`,
    `--platform=node`,
    `--target=node20`,
    `--external:node:*`,
    // shim para require() de módulos CJS (ex: react-dom/server.node.js usa require("util"))
    `--banner:js="import{createRequire}from'node:module';const require=createRequire(import.meta.url);"`,
    `--outfile="${out}/functions/ssr.func/index.mjs"`,
  ].join(" "),
  { cwd: root, stdio: "inherit" }
);

unlinkSync(entryPath);

// 4. Config da função Node.js
writeFileSync(
  `${out}/functions/ssr.func/.vc-config.json`,
  JSON.stringify(
    { runtime: "nodejs20.x", handler: "index.mjs", launcherType: "Nodejs" },
    null,
    2
  )
);

// 5. Config de roteamento: arquivos estáticos primeiro, depois SSR
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/ssr" },
      ],
    },
    null,
    2
  )
);

console.log("✓ .vercel/output gerado com sucesso");
