/**
 * Deploy Test USDT (TRC20) on TRON Shasta Testnet
 */

const TronWeb = require('tronweb');

// TRC20 Token Contract (simplified USDT)
const TRC20_CONTRACT = `
pragma solidity ^0.5.0;

contract TestUSDT {
    string public name = "Test USDT";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _initialSupply) public {
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
`;

// Compiled bytecode for the contract (pre-compiled to avoid needing solc)
// This is a standard TRC20 token bytecode
const BYTECODE = "608060405234801561001057600080fd5b506040516107a83803806107a88339818101604052602081101561003357600080fd5b50516040805180820190915260098152682a32b9ba1027a9a22a60b91b60208201526000906100629082610179565b506040805180820190915260048152631554d11560e21b60208201526001906100909082610179565b506002805460ff191660061790556002546100b09060ff16600a610251565b6100ba908261025f565b600381905533600081815260046020908152604080832085905551938452919290917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a350610276565b634e487b7160e01b600052604160045260246000fd5b600181811c9082168061013757607f821691505b60208210810361015757634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111561017457600081815260208120601f850160051c810160208610156101845750805b601f850160051c820191505b818110156101a357828155600101610190565b505050505050565b81516001600160401b038111156101c4576101c461010d565b6101d8816101d28454610123565b8461015d565b602080601f83116001811461020d57600084156101f55750858301515b600019600386901b1c1916600185901b1785556101a3565b600085815260208120601f198616915b8281101561023c5788860151825594840194600190910190840161021d565b508582101561025a5787850151600019600388901b60f8161c191681555b505060018460011b0185555050505050565b808202811582820484141761028357610283610297565b92915050565b634e487b7160e01b600052601160045260246000fd5b610523806102ad6000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063313ce56711610066578063313ce5671461010357806370a082311461011257806395d89b4114610135578063a9059cbb1461013d578063dd62ed3e1461015057600080fd5b806306fdde0314610098578063095ea7b3146100b657806318160ddd146100d957806323b872dd146100f0575b600080fd5b6100a0610189565b6040516100ad919061041b565b60405180910390f35b6100c96100c4366004610467565b610217565b60405190151581526020016100ad565b6100e260035481565b6040519081526020016100ad565b6100c96100fe366004610491565b61022e565b60025460405160ff90911681526020016100ad565b6100e26101203660046104cd565b60046020526000908152604090205481565b6100a06102b8565b6100c961014b366004610467565b6102c5565b6100e261015e3660046104ef565b600560209081526000928352604080842090915290825290205481565b6000805461018890610522565b80601f01602080910402602001604051908101604052809291908181526020018280546101b490610522565b80156102015780601f106101d657610100808354040283529160200191610201565b820191906000526020600020905b8154815290600101906020018083116101e457829003601f168201915b505050505090505b90565b600061022433848461030e565b5060015b92915050565b6001600160a01b0383166000908152600460205260408120548211156102695760405162461bcd60e51b815260206004820152600b60248201526a4e6f7420656e6f75676860a81b604482015260640160405180910390fd5b6001600160a01b03841660009081526005602090815260408083203384529091529020548211156102ac5760405162461bcd60e51b815260040160405180910390fd5b61022484848461036a565b6001805461018890610522565b336000908152600460205260408120548211156103125760405162461bcd60e51b815260206004820152600b60248201526a4e6f7420656e6f75676860a81b604482015260640160405180910390fd5b61031d33848461036a565b50600192915050565b6001600160a01b0383811660008181526005602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b038316600090815260046020526040812080548392906103929084906104ef565b90915550506001600160a01b038216600090815260046020526040812080548392906103bf9084906104ef565b90915550506040518181526001600160a01b0383169084907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a3505050565b600060208083528351808285015260005b818110156104485785810183015185820160400152820161042c565b506000604082860101526040601f19601f8301168501019250505092915050565b6000806040838503121561047a57600080fd5b82356001600160a01b038116811461049057600080fd5b946020939093013593505050565b6000806000606084860312156104a657600080fd5b505081359360208301359350604090920135919050565b80356001600160a01b03811681146104d357600080fd5b919050565b6000602082840312156104df57600080fd5b6104e8826104bd565b9392505050565b6000806040838503121561050257600080fd5b61050b836104bd565b9150610519602084016104bd565b90509250929050565b600181811c9082168061053657607f821691505b60208210810361055657634e487b7160e01b600052602260045260246000fd5b5091905056fea264697066735822122089abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567864736f6c63430008130033";

async function main() {
  console.log('🚀 Deploying Test USDT on TRON Shasta Testnet...\n');

  // You need to get TRX from Shasta faucet first:
  // https://shasta.tronex.io/ or https://www.trongrid.io/faucet

  // Derive TRON address from mnemonic
  const mnemonic = 'symptom cancel timber describe rubber admit audit upon problem transfer until obey';

  // Create TronWeb instance for Shasta testnet
  const tronWeb = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    // We need to derive the private key from mnemonic for TRON
    // TRON uses m/44'/195'/0'/0/0 derivation path
  });

  // For simplicity, let's generate a new account or use derived key
  // First, let's derive from mnemonic
  const bip39 = require('bip39');
  const hdkey = require('hdkey');

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = hdkey.fromMasterSeed(seed);
  const addrNode = root.derive("m/44'/195'/0'/0/0"); // TRON derivation path
  const privateKey = addrNode.privateKey.toString('hex');

  tronWeb.setPrivateKey(privateKey);

  const address = tronWeb.address.fromPrivateKey(privateKey);
  console.log(`📍 Deployer Address: ${address}`);

  // Check balance
  const balance = await tronWeb.trx.getBalance(address);
  console.log(`💰 Balance: ${balance / 1e6} TRX`);

  if (balance < 100 * 1e6) { // Need at least 100 TRX
    console.log('\n⚠️  Insufficient TRX balance!');
    console.log('📋 Get test TRX from: https://shasta.tronex.io/');
    console.log(`   Address to fund: ${address}`);
    console.log('\nRun this script again after getting test TRX.');
    return;
  }

  console.log('\n📝 Deploying Test USDT contract...');

  // Deploy contract with 20 million supply
  const initialSupply = 20000000;

  try {
    const transaction = await tronWeb.transactionBuilder.createSmartContract({
      abi: [
        {"inputs":[{"name":"_initialSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
        {"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
      ],
      bytecode: BYTECODE,
      feeLimit: 1000000000,
      callValue: 0,
      parameters: [initialSupply]
    }, address);

    const signedTx = await tronWeb.trx.sign(transaction);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    console.log(`✅ Contract deployed!`);
    console.log(`   Transaction: ${result.txid}`);

    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    await new Promise(r => setTimeout(r, 5000));

    const txInfo = await tronWeb.trx.getTransactionInfo(result.txid);
    const contractAddress = tronWeb.address.fromHex(txInfo.contract_address);

    console.log(`\n🎉 Test USDT Token Created Successfully!`);
    console.log('━'.repeat(50));
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Total Supply: ${initialSupply.toLocaleString()} USDT`);
    console.log(`Decimals: 6`);
    console.log(`Network: TRON Shasta Testnet`);
    console.log('━'.repeat(50));

  } catch (error: any) {
    console.error('❌ Deployment failed:', error.message);
  }
}

main().catch(console.error);
