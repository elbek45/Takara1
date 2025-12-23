const { ethers } = require('ethers');

// BSC Testnet configuration
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const PRIVATE_KEY = '0x1cc99a2885dcb66a4aaeda8ede9c20fd34c619aa320b1d980c268ac279e03291';
const TO_ADDRESS = '0x2a69f35ff0F3BfDD0DefF73C9F4CC29415c3A46E';
const AMOUNT = '100'; // 100 USDT

// BSC Testnet USDT contract (mock USDT for testing)
const USDT_CONTRACT = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function main() {
  console.log('Connecting to BSC Testnet...');
  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Platform wallet:', wallet.address);
  
  // Check BNB balance for gas
  const bnbBalance = await provider.getBalance(wallet.address);
  console.log('BNB Balance:', ethers.formatEther(bnbBalance), 'BNB');
  
  if (bnbBalance === 0n) {
    console.log('\nERROR: No BNB for gas!');
    console.log('Get test BNB from: https://testnet.bnbchain.org/faucet-smart');
    return;
  }
  
  // Check USDT balance
  const usdt = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, wallet);
  
  try {
    const [decimals, symbol, balance] = await Promise.all([
      usdt.decimals(),
      usdt.symbol(),
      usdt.balanceOf(wallet.address)
    ]);
    
    console.log('Token:', symbol, '| Decimals:', decimals);
    console.log('USDT Balance:', ethers.formatUnits(balance, decimals));
    
    const amount = ethers.parseUnits(AMOUNT, decimals);
    
    if (balance < amount) {
      console.log('\nERROR: Insufficient USDT balance!');
      console.log('Need:', AMOUNT, 'Have:', ethers.formatUnits(balance, decimals));
      return;
    }
    
    console.log('\nSending', AMOUNT, symbol, 'to', TO_ADDRESS, '...');
    const tx = await usdt.transfer(TO_ADDRESS, amount);
    console.log('TX Hash:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('\n✓ Success! Confirmed in block:', receipt.blockNumber);
    console.log('View on BSCScan: https://testnet.bscscan.com/tx/' + tx.hash);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
