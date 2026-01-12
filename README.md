# Lenoa - P2P Lending Protocol with Tokenized Loans

> Transform illiquid loans into tradeable NFTs. Instant liquidity for lenders, seamless P2P lending for everyone.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![Tests](https://img.shields.io/badge/Tests-98%2F98-brightgreen)](./test)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)](https://hardhat.org/)

## What is Lenoa?

Lenoa is a decentralized P2P lending protocol where **every loan is an NFT**. This creates a secondary market for loans, giving lenders instant liquidity while maintaining complete decentralization.

### The Problem
Traditional DeFi lending locks your capital. Lend 1000 USDC? You're stuck until the borrower repays.

### Our Solution
- **Lend money**  Get an NFT representing your loan
- **Trade the NFT**  Exit your position anytime
- **Secondary markets** Instant liquidity for lenders

## Key Features

### Core Functionality
- **P2P Lending**: Direct borrower-to-lender matching
- **NFT Tokenization**: Every funded loan becomes a tradeable ERC-721 NFT
- **Multi-Token Support**: ETH, DAI, USDC, LINK, WETH on Sepolia
- **Flexible Terms**: Custom interest rates, durations, and collateral ratios
- **Secondary Markets**: Trade loan NFTs on any NFT marketplace

### Platform Fees
- **0.5%** origination fee (from borrower when funded)
- **5%** of interest (from lender's profit on repayment)
- All fees are collected on-chain and withdrawable by protocol owner

## How It Works

### For Borrowers
1. Deposit Collateral > 2. Create Loan Request > 3. Get Funded > 4. Repay Loan

### For Lenders
1. Browse Loans > 2. Fund a Loan > 3. Receive NFT > 4. Get Repayment (or Trade NFT)

### For NFT Traders
1. Buy Loan NFT > 2. Collect Repayment > 3. Or Liquidate Collateral on Default


## Tech Stack

- **Smart Contracts**: Solidity 0.8.20
- **Framework**: Hardhat
- **Testing**: Chai, Ethers.js
- **Standards**: ERC-721, OpenZeppelin
- **Network**: Ethereum Sepolia (Testnet)

## Installation

### Quick Start
```bash
# Clone the repo
git clone https://github.com/samuelegin/lenoa.git
cd lenoa

# Install dependencies
npm install

# Setup environment
cp .env
# Edit .env with your keys

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Deploy to Sepolia
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**[Full Setup Guide →](./SETUP.md)**

## Testing

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

**Test Results:**
```
98 tests passing
Integration tests
Security attack vectors
Access control
NFT trading scenarios
Edge cases
```

## Usage Examples

### Create a Loan Request
```javascript
const tx = await loanFactory.createLoanRequest(
  "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", // DAI token
  ethers.parseEther("1000"),                      // 1000 DAI
  10,                                             // 10% interest
  30,                                             // 30 days
  ethers.ZeroAddress,                             // ETH collateral
  ethers.parseEther("0.5"),                       // 0.5 ETH
  { value: ethers.parseEther("0.5") }
)
```

### Fund a Loan
```javascript
const tx = await loanFactory.fundLoan(
  loanId,
  { value: ethers.parseEther("1000") } // If ETH loan
)
// Lender receives NFT with tokenId = loanId
```

### Trade the NFT
```javascript
// On any NFT marketplace, or programmatically:
await loanNFT.transferFrom(lender, buyer, loanId)
// Buyer now receives repayment when borrower pays back
```

### Repay Loan
```javascript
const repaymentAmount = ethers.parseEther("1100") // Principal + interest
const tx = await loanFactory.repayLoan(
  loanId,
  { value: repaymentAmount }
)
// Payment goes to current NFT holder
```

## Supported Tokens

| Token | Network | Address | Min Loan | Max Loan |
|-------|---------|---------|----------|----------|
| **ETH** | Sepolia | `0x0000...0000` | 0.01 ETH | 10 ETH |
| **DAI** | Sepolia | `0xFF34...a357` | 100 DAI | 10,000 DAI |
| **USDC** | Sepolia | `0x94a9...4C8` | 100 USDC | 10,000 USDC |
| **LINK** | Sepolia | `0x7798...789` | 10 LINK | 1,000 LINK |
| **WETH** | Sepolia | `0xfFf9...14` | 0.01 WETH | 10 WETH |

## Security

### Audited Features
- Access control (Ownable)
- Reentrancy guards
- SafeERC20 for token transfers
- Front-running protection
- Integer overflow protection (0.8.20+)
- Emergency withdrawal mechanisms

### Attack Vectors Tested
- Unauthorized minting blocked
- Privilege escalation blocked
- Fake token transfers blocked
- Griefing attacks mitigated
- Self-funding blocked

**Note**: This is testnet code. Do NOT deploy to mainnet without a professional security audit.

## Fee Structure

```
Example: 1000 DAI loan at 10% interest for 30 days

Borrower requests:    1000 DAI
Origination fee:        -5 DAI (0.5%)
Borrower receives:     995 DAI

Repayment amount:     1100 DAI (1000 + 10%)
Interest earned:       100 DAI
Interest fee:           -5 DAI (5% of 100)
Lender receives:      1095 DAI

Protocol earns:         10 DAI total
```

### Withdraw Fees (Owner Only)
```javascript
// Withdraw specific token
await loanFactory.withdrawFees("0xDAI_ADDRESS")

// Withdraw all accumulated fees
await loanFactory.withdrawAllFees()
```
## Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/YourAmazingFeature`)
3. Commit changes (`git commit -m 'Add YourAmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Write tests for all new features
- Follow Solidity style guide
- Add NatSpec comments
- Update documentation

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## Links

- **Documentation**: [docs.lenoa.app](#)
- **Website**: [lenoa.app](#)
- **Twitter**: [@LenoaProtocol](#)
- **Discord**: [Join our community](#)
- **Testnet App**: [app.lenoa.app](#)

## Contact

Built by [@0xEtherfren](#)

Questions? Open an [issue](https://github.com/samuelegin/lenoa/issues) or reach out on [Discord](#).


** Disclaimer**: This is experimental software. Use at your own risk. Not audited for production use.

Made with ❤️ for DeFi