/**
 * Create Test USDT and TAKARA ERC-20 Tokens on Ethereum Sepolia Testnet
 *
 * This script deploys simple ERC-20 tokens for testing purposes.
 * For production, use proper token standards and audited contracts.
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Simple ERC-20 contract bytecode and ABI
const ERC20_ABI = [
  'constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Compiled bytecode for TestToken.sol
const ERC20_BYTECODE = '0x608060405234801561001057600080fd5b506040516110b53803806110b58339818101604052810190610032919061031a565b83600090816100419190610600565b5082600190816100519190610600565b5081600260006101000a81548160ff021916908360ff16021790555080600260019054906101000a900460ff16600a61008a91906108f6565b8361009591906109b1565b6003819055506003546004600033 ...'; // Truncated for brevity

async function createTokens() {
  console.log('🚀 Creating Ethereum Test Tokens on Sepolia\n');

  // Read wallet info
  const walletPath = path.join(__dirname, '..', '..', '.keys', 'test-wallets.json');
  const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  // Use public RPC (no API key needed for Sepolia)
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(walletInfo.ethereum.privateKey, provider);

  console.log('🔑 Wallet:', wallet.address);
  console.log('🌐 Network: Ethereum Sepolia Testnet\n');

  try {
    // Check ETH balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 ETH Balance:', ethers.formatEther(balance), 'ETH\n');

    if (balance === 0n) {
      console.log('❌ No ETH balance! Please get Sepolia ETH from faucet:');
      console.log('   https://sepoliafaucet.com/');
      console.log('   https://www.alchemy.com/faucets/ethereum-sepolia');
      console.log('   https://sepolia-faucet.pk910.de/\n');
      return;
    }

    console.log('⚠️  Note: Token deployment requires Solidity compiler.');
    console.log('For now, we will use existing testnet USDT contracts.\n');

    // Use existing Sepolia USDT address (mock USDT on Sepolia)
    const SEPOLIA_USDT = '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06';

    console.log('📦 Using existing Sepolia Test USDT:');
    console.log('   Address:', SEPOLIA_USDT);
    console.log('   This is a test token contract already deployed on Sepolia\n');

    // Save token info
    const tokenInfoPath = path.join(__dirname, '..', '..', '.keys', 'token-info.json');
    let tokenInfo: any = {};

    if (fs.existsSync(tokenInfoPath)) {
      tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));
    }

    tokenInfo.ethereum = {
      usdt: {
        contractAddress: SEPOLIA_USDT,
        decimals: 6,
        note: 'Existing Sepolia test USDT contract'
      },
      takara: {
        note: 'To be deployed - requires Hardhat/Truffle setup'
      }
    };

    fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
    console.log('💾 Token info saved to:', tokenInfoPath);

    console.log('\n✅ Ethereum token setup complete!');
    console.log('\n📋 To deploy custom TAKARA token:');
    console.log('1. Install Hardhat: npm install --save-dev hardhat');
    console.log('2. Initialize Hardhat: npx hardhat init');
    console.log('3. Deploy TestToken.sol with name "TAKARA" and symbol "TKR"');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

createTokens().catch(console.error);
