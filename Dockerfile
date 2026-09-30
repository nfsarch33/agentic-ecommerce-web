FROM oven/bun:1.3.13 AS deps

WORKDIR /app

ENV CI=1

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run next under REAL node: the bun base image ships no node, so
# 'bun run build' executes the next bin through bun's node shim, which
# trips a Bun CJS loader bug on next-server's turbo runtime
# ('Expected CommonJS module to have a function wrapper'). Wherever node
# exists (CI VM, dev hosts) the same build is green.
RUN mkdir -p public && node node_modules/next/dist/bin/next build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

# The bundled npm carries its own vulnerable transitive tree (pacote,
# sigstore, ip-address, brace-expansion; trivy HIGH x7) and the server
# never invokes npm at runtime — remove the whole bundle instead of
# ignoring the findings.
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /usr/sbin/nologin nextjs     && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
