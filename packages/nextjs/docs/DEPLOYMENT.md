# Deployment Guide

Deploy Cryptletter Next.js application to Vercel or self-hosted.

## Environment Variables

Create `.env.local` or set in your deployment platform:

```env
# Required - Alchemy RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# Required - WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# Required - Pinata IPFS
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_PINATA_GATEWAY=https://your-gateway.mypinata.cloud

# Optional - Server-side Pinata API (if needed)
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
```

## Vercel Deployment

### Quick Deploy (CLI)

```bash
pnpm add -g vercel
vercel login
vercel --prod
```

### Via Dashboard

1. Import GitHub repo
2. Set root: `packages/nextjs`
3. Build command: `cd ../.. && pnpm install && pnpm build --filter nextjs`
4. Add environment variables (see above)
5. Deploy

## Self-Hosted

### Build & Run

```bash
# Build
pnpm build

# Start
pnpm serve  # or: cd packages/nextjs && pnpm start
```

### Docker

```bash
docker build -t cryptletter .
docker run -p 3000:3000 cryptletter
```

## Post-Deployment Checklist

- [ ] Environment variables set correctly
- [ ] Contract addresses in `deployedContracts.ts` match network
- [ ] Wallet connection working
- [ ] IPFS upload/download working
- [ ] Newsletter publish flow working
- [ ] Newsletter decrypt flow working
- [ ] Subscription payment working

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Run `pnpm check-types` first |
| Env vars not working | Client vars need `NEXT_PUBLIC_` prefix, rebuild after changes |
| Contract not found | Check `deployedContracts.ts`, run `pnpm generate` |
| IPFS upload fails | Verify Pinata JWT and gateway URL |

---

**Docs:** [Next.js](https://nextjs.org/docs/deployment) · [Vercel](https://vercel.com/docs)
