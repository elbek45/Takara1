/**
 * Check Testnet Balances
 * Checks balances for Ethereum Sepolia and Solana Devnet
 */

const { Web3 } = require('web3');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function checkEthereumBalance() {
  console.log(`\n${colors.bright}${colors.cyan}========== ETHEREUM SEPOLIA ===========${colors.reset}`);

  const address = '0x5B2De17a0aC667B08B501C92e6B271ed110665E1';

  // Try with public RPC first
  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://rpc.sepolia.org';

  try {
    const web3 = new Web3(rpcUrl);
    const balance = await web3.eth.getBalance(address);
    const ethBalance = Number(web3.utils.fromWei(balance, 'ether'));

    console.log(`Address: ${colors.bright}${address}${colors.reset}`);
    console.log(`ETH Balance: ${colors.bright}${ethBalance.toFixed(4)} ETH${colors.reset}`);

    if (ethBalance < 0.01) {
      console.log(`${colors.yellow}⚠️  Low balance! Get testnet ETH from:${colors.reset}`);
      console.log(`   https://sepoliafaucet.com/`);
      console.log(`   https://sepolia-faucet.pk910.de/`);
    } else {
      console.log(`${colors.green}✅ Balance sufficient for deployment${colors.reset}`);
    }

    // Check network
    const chainId = await web3.eth.getChainId();
    console.log(`Network: ${chainId === 11155111n ? colors.green + 'Sepolia (11155111)' : colors.red + 'Wrong network!'}${colors.reset}`);

  } catch (error) {
    console.log(`${colors.red}❌ Error connecting to Ethereum:${colors.reset}`, error.message);
    console.log(`${colors.yellow}💡 Set ETHEREUM_RPC_URL in .env.testnet${colors.reset}`);
  }
}

async function checkSolanaBalance() {
  console.log(`\n${colors.bright}${colors.cyan}========== SOLANA DEVNET ===========${colors.reset}`);

  const address = 'AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i';

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const publicKey = new PublicKey(address);

    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    console.log(`Address: ${colors.bright}${address}${colors.reset}`);
    console.log(`SOL Balance: ${colors.bright}${solBalance.toFixed(4)} SOL${colors.reset}`);

    if (solBalance < 0.5) {
      console.log(`${colors.yellow}⚠️  Low balance! Get devnet SOL:${colors.reset}`);
      console.log(`   solana airdrop 2 ${address} --url devnet`);
    } else {
      console.log(`${colors.green}✅ Balance sufficient for NFT minting${colors.reset}`);
    }

    // Check token balances
    console.log(`\n${colors.bright}SPL Token Balances:${colors.reset}`);

    const tokens = [
      { name: 'TAKARA', mint: '2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn' },
      { name: 'LAIKA', mint: '8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM' }
    ];

    for (const token of tokens) {
      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(token.mint) }
        );

        if (tokenAccounts.value.length > 0) {
          const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
          console.log(`${token.name}: ${colors.bright}${accountInfo.value.uiAmount?.toLocaleString() || 0}${colors.reset}`);
        } else {
          console.log(`${token.name}: ${colors.yellow}No token account${colors.reset}`);
        }
      } catch (error) {
        console.log(`${token.name}: ${colors.red}Error${colors.reset}`);
      }
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error connecting to Solana:${colors.reset}`, error.message);
  }
}

async function checkMockUSDT() {
  console.log(`\n${colors.bright}${colors.cyan}========== MOCK USDT CONTRACT ===========${colors.reset}`);

  const contractAddress = process.env.USDT_CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    console.log(`${colors.yellow}⚠️  Mock USDT not deployed yet${colors.reset}`);
    console.log(`   Run: node scripts/deploy-mock-usdt.js`);
    return;
  }

  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://rpc.sepolia.org';

  try {
    const web3 = new Web3(rpcUrl);

    // Check if contract exists
    const code = await web3.eth.getCode(contractAddress);

    if (code === '0x' || code === '0x0') {
      console.log(`${colors.red}❌ Contract not found at ${contractAddress}${colors.reset}`);
      return;
    }

    console.log(`Contract: ${colors.bright}${contractAddress}${colors.reset}`);
    console.log(`${colors.green}✅ Contract deployed${colors.reset}`);
    console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);

  } catch (error) {
    console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
  }
}

async function main() {
  console.log(`${colors.bright}${colors.green}`);
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   TAKARA GOLD - TESTNET BALANCE CHECK     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(colors.reset);

  await checkEthereumBalance();
  await checkSolanaBalance();
  await checkMockUSDT();

  console.log(`\n${colors.bright}${colors.cyan}=========================================${colors.reset}\n`);
}

main().catch(console.error);
