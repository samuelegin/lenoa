const { ethers } = require("hardhat");

const SEPOLIA_TOKENS = {
  DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
  USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  ETH: ethers.ZeroAddress
};

async function deployContracts() {
  const [owner, borrower, lender, other] = await ethers.getSigners();

  const mockDAI = await deployMockERC20("Mock DAI", "mDAI", 18);
  const mockUSDC = await deployMockERC20("Mock USDC", "mUSDC", 6);
  const mockLINK = await deployMockERC20("Mock LINK", "mLINK", 18);
  const LoanNFT = await ethers.getContractFactory("LoanNFT");
  const loanNFT = await LoanNFT.deploy();
  await loanNFT.waitForDeployment();

  const CollateralVault = await ethers.getContractFactory("CollateralVault");
  const collateralVault = await CollateralVault.deploy();
  await collateralVault.waitForDeployment();

  const LoanFactory = await ethers.getContractFactory("LoanFactory");
  const loanFactory = await LoanFactory.deploy(
    await loanNFT.getAddress(),
    await collateralVault.getAddress()
  );
  await loanFactory.waitForDeployment();

  await loanNFT.setLoanFactory(await loanFactory.getAddress());
  await collateralVault.setLoanFactory(await loanFactory.getAddress());

  return {
    loanFactory,
    loanNFT,
    collateralVault,
    owner,
    borrower,
    lender,
    other,
    mockDAI,
    mockUSDC,
    mockLINK
  };
}

async function deployMockERC20(name, symbol, decimals = 18) {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy(name, symbol, decimals);
  await token.waitForDeployment();
  return token;
}

function calculateRepaymentAmount(loanAmount, interestRate) {
  return loanAmount + (loanAmount * BigInt(interestRate) / 100n);
}

async function timeTravel(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine");
}

async function getBlockTimestamp() {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp;
}

function calculateAmountAfterOriginationFee(loanAmount, feePercent = 50) {
  const fee = (loanAmount * BigInt(feePercent)) / 10000n;
  return loanAmount - fee;
}

function calculateLenderReceivesAfterInterestFee(repaymentAmount, loanAmount, interestFeePercent = 500) {
  const interest = repaymentAmount - loanAmount;
  const interestFee = (interest * BigInt(interestFeePercent)) / 10000n;
  return repaymentAmount - interestFee;
}

module.exports = {
  SEPOLIA_TOKENS,
  deployContracts,
  deployMockERC20,
  calculateRepaymentAmount,
  timeTravel,
  getBlockTimestamp
};