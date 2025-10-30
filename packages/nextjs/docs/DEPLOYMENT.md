# Deployment Guide

Quick deployment guide for Cryptletter Next.js application.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Vercel Deployment](#vercel-deployment)
3. [Self-Hosted Deployment](#self-hosted-deployment)
4. [Post-Deployment Checklist](#post-deployment-checklist)

## Environment Variables

Create `.env.local` or set in your deployment platform:

```env
# Required
NEXT_PUBLIC_CHAIN_ID=11155111

# Optional
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_PUBLIC_KUBO_RPC_URL=http://127.0.0.1:5001
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## Vercel Deployment

### Quick Deploy

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
pnpm vercel:login

# Deploy preview
pnpm vercel

# Deploy to production
pnpm vercel --prod
```

### Via Vercel Dashboard

1. **Import Project**
   - Connect GitHub repository
   - Select `packages/nextjs` as root directory

2. **Configure Build**
   - Framework: Next.js
   - Build Command: `cd ../.. && pnpm install && pnpm build --filter nextjs`
   - Output Directory: `.next`

3. **Set Environment Variables**
   - Add all variables from `.env.local`
   - Make sure to prefix with `NEXT_PUBLIC_`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Custom Domain

```bash
# Add domain via CLI
vercel domains add yourdomain.com

# Or via Vercel dashboard:
# Settings → Domains → Add Domain
```

## Self-Hosted Deployment

### Build for Production

```bash
# From root directory
pnpm build

# Or from nextjs package
cd packages/nextjs
pnpm build
```

### Start Production Server

```bash
# From root
pnpm serve

# Or from nextjs package
pnpm start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build stage
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/nextjs/package.json ./packages/nextjs/
COPY packages/fhevm-sdk/package.json ./packages/fhevm-sdk/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build --filter nextjs

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/nextjs/.next ./packages/nextjs/.next
COPY --from=builder /app/packages/nextjs/public ./packages/nextjs/public
COPY --from=builder /app/packages/nextjs/package.json ./packages/nextjs/

EXPOSE 3000

CMD ["pnpm", "--filter", "nextjs", "start"]
```

Build and run:

```bash
docker build -t cryptletter .
docker run -p 3000:3000 cryptletter
```

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Smart contracts deployed to correct network
- [ ] Contract addresses updated in `deployedContracts.ts`
- [ ] IPFS gateway accessible
- [ ] Wallet connection works
- [ ] Test creator registration
- [ ] Test newsletter publishing
- [ ] Test subscription flow
- [ ] Test content decryption
- [ ] Check error handling
- [ ] Verify responsive design
- [ ] Test on mobile devices

## Troubleshooting

**Build fails with TypeScript errors:**

```bash
# Check types first
pnpm check-types

# Ignore during build (not recommended)
NEXT_PUBLIC_IGNORE_BUILD_ERROR=true pnpm build
```

**Environment variables not working:**

- Make sure they start with `NEXT_PUBLIC_`
- Rebuild after changing env vars
- Check Vercel dashboard for correct values

**Contract not found:**

- Verify contract is deployed on correct network
- Check `contracts/deployedContracts.ts` has correct addresses
- Run `pnpm generate` to update ABIs

**IPFS upload fails:**

- Check IPFS node is running
- Verify `NEXT_PUBLIC_KUBO_RPC_URL` is correct
- Try using public gateway as fallback

---

For more details:

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
