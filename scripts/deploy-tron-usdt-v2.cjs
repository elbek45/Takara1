const TronWeb = require('tronweb').default || require('tronweb');
const bip39 = require('bip39');
const hdkey = require('hdkey');

// Simple TRC20 source code
const CONTRACT_SOURCE = `
pragma solidity ^0.8.0;

contract TestUSDT {
    string public name = "Test USDT";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) public returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balanceOf[_from] >= _value, "Insufficient");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
`;

async function main() {
  console.log('🚀 Deploying Test USDT on TRON Shasta (using TronWeb compiler)...\n');

  const mnemonic = 'symptom cancel timber describe rubber admit audit upon problem transfer until obey';
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = hdkey.fromMasterSeed(seed);
  const addrNode = root.derive("m/44'/195'/0'/0/0");
  const privateKey = addrNode.privateKey.toString('hex');

  const TronWebClass = TronWeb.TronWeb || TronWeb;
  const tronWeb = new TronWebClass({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: privateKey
  });

  const address = tronWeb.address.fromPrivateKey(privateKey);
  console.log('📍 Deployer Address:', address);

  const balance = await tronWeb.trx.getBalance(address);
  console.log('💰 Balance:', balance / 1e6, 'TRX\n');

  if (balance < 500 * 1e6) {
    console.log('⚠️  Need more TRX! Get from: https://shasta.tronex.io/');
    return;
  }

  // Use TronWeb's contract deployment with source
  const initialSupply = 20000000;
  
  console.log('📝 Compiling and deploying contract...');
  
  try {
    const result = await tronWeb.contract().new({
      abi: [
        {"inputs":[{"name":"_initialSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
        {"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
      ],
      bytecode: "60806040523480156200001157600080fd5b506040516200114738038062001147833981810160405281019062000037919062000274565b6040518060400160405280600981526020017f5465737420555344540000000000000000000000000000000000000000000000815250600090816200007d9190620004f6565b506040518060400160405280600481526020017f55534454000000000000000000000000000000000000000000000000000000008152506001908162000143919062000637565b506006600260006101000a81548160ff021916908360ff16021790555062000178565b505050565b5050505050565b600080fd5b6000819050919050565b6200018c8162000177565b81146200019857600080fd5b50565b600081519050620001ac8162000181565b92915050565b600060208284031215620001cb57620001ca62000172565b5b6000620001db848285016200019b565b91505092915050565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806200026657607f821691505b6020821081036200027c576200027b6200021e565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b600060088302620002e67fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82620002a7565b620002f28683620002a7565b95508019841693508086168417925050509392505050565b6000819050919050565b6000620003356200032f620003298462000177565b6200030a565b62000177565b9050919050565b6000819050919050565b620003518362000314565b620003696200036082620003c565b848454620002b4565b825550505050565b600090565b6200038062000371565b6200038d81848462000346565b505050565b5b81811015620003b557620003a960008262000376565b60018101905062000393565b5050565b601f8211156200040457620003ce8162000282565b620003d98462000297565b81016020851015620003e9578190505b62000401620003f88562000297565b83018262000392565b50505b505050565b600082821c905092915050565b600062000429600019846008026200040962000177565b9350505b5050919050565b600062000442838362000416565b9150826002028217905092915050565b6200045d82620001e4565b67ffffffffffffffff811115620004795762000478620001ef565b5b6200048582546200024d565b62000492828285620003b9565b600060209050601f831160018114620004ca5760008415620004b5578287015190505b620004c1858262000434565b86555062000531565b601f198416620004da8662000282565b60005b828110156200050457848901518255600182019150602085019450602081019050620004dd565b8683101562000524578489015162000520601f89168262000416565b8355505b6001600288020188555050505b505050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60008160011c9050919050565b6000808291508390505b60018511156200059f57808604811115620005995762000598620005395b0515506200059f565b60019250600185901b9450508315156200059f57600080fd5b600090565b600019810462000628565b60018503925081801562000624576200062f565b62000628565b9050601b600582031262000627576200062f565b5b5b50919050565b600082825260208201905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680620006885757f21691505b602082108103620006b757620006b66200063f565b5b50919050565b610a8080620006cd6000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c806370a082311161007157806370a082311461016857806395d89b4114610198578063a9059cbb146101b6578063dd62ed3e146101e6578063",
      feeLimit: 1000000000,
      callValue: 0,
      userFeePercentage: 100,
      originEnergyLimit: 10000000,
      parameters: [initialSupply]
    });

    console.log('✅ Contract deployed!');
    console.log('Contract Address:', result.address);
    console.log('Total Supply: 20,000,000 USDT');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message || error);
  }
}

main().catch(console.error);
