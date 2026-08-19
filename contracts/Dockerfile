FROM node:22-bookworm-slim

ENV NODE_ENV=development \
    HARDHAT_DISABLE_TELEMETRY_PROMPT=true \
    HARDHAT_CHAIN_ID=31337 \
    HARDHAT_RPC_URL=http://127.0.0.1:8545

WORKDIR /srv/sentient/contracts

COPY contracts/package.json contracts/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY contracts/hardhat.config.cjs ./hardhat.config.cjs
COPY contracts/src ./src
COPY contracts/scripts ./scripts

RUN npx hardhat compile

EXPOSE 8545

HEALTHCHECK --interval=3s --timeout=2s --retries=20 --start-period=3s \
  CMD node scripts/healthcheck.cjs

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
