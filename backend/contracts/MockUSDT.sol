// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Mock USDT Contract for Sepolia Testnet
 * ERC-20 implementation with 6 decimals (same as real USDT)
 */
contract MockUSDT {
    string public name = "Mock Tether USD";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);

    constructor() {
        // Mint 1 million USDT to deployer for testing
        _mint(msg.sender, 1000000 * 10**6);
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");

        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;

        emit Transfer(from, to, value);
        return true;
    }

    // Faucet function - anyone can mint 1000 USDT for testing
    function faucet() public {
        uint256 amount = 1000 * 10**6; // 1000 USDT
        _mint(msg.sender, amount);
    }

    // Mint function (only for testing)
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
}
