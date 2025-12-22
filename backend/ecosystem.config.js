module.exports = {
  apps: [{
    name: 'takara-backend',
    script: './dist/app.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://takara_user:TakaraSecure2025Pass@127.0.0.1:5432/takara_production',
      JWT_SECRET: '5518e3b09562c0335fce4022c6e6edc7a17f25c6cd309a1048296d960aa6b557',
      JWT_EXPIRES_IN: '7d',
      REDIS_URL: 'redis://localhost:6379',
      FRONTEND_URL: 'https://sitpool.org',
      CORS_ORIGIN: 'https://sitpool.org,http://159.203.104.235,http://localhost:5173,http://localhost:3000',
      SOLANA_RPC_URL: 'https://api.devnet.solana.com',
      LOG_LEVEL: 'info',
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX: 100,
      ADMIN_RATE_LIMIT_WINDOW_MS: 900000,
      ADMIN_RATE_LIMIT_MAX: 5,
      PLATFORM_WALLET: 'HbTpSgKgVTpSRdm9GwW72HS6JHXgCQgciYJkpsRs5CGT',
      PLATFORM_WALLET_PRIVATE_KEY: '26A4TECQ7cLZ7EjXnCh8yjfcd5fsxHrZ8Th5rw4HNt1HnFzVFZoSoSTRX5Bjp7zJ8h83u4eRF2PdQSy3jxvXDQXd',
      PLATFORM_ETHEREUM_ADDRESS: '0x9dDD3F657fAa82ef17424722DdCB0c403AC8eDA4',
      PLATFORM_ETHEREUM_PRIVATE_KEY: '0x6b10a13cad6184f9c5ace5e4ba64a115c9c9b047cfa51ed8d98b799c04744ba7',
      ETHEREUM_NETWORK: 'sepolia',
      ETHEREUM_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
      ETHEREUM_CHAIN_ID: 11155111,
      USDT_TOKEN_ADDRESS: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      SKIP_TX_VERIFICATION: 'true',
      ENABLE_CRON_JOBS: 'false'
    }
  }]
};
