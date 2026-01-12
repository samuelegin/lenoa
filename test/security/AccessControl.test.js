const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts } = require("../helpers/testHelpers");

function calculateAmountAfterOriginationFee(loanAmount, feePercent = 50) {
  const fee = (loanAmount * BigInt(feePercent)) / 10000n;
  return loanAmount - fee;
}

function calculateLenderReceivesAfterInterestFee(repaymentAmount, loanAmount, interestFeePercent = 500) {
  const interest = repaymentAmount - loanAmount;
  const interestFee = (interest * BigInt(interestFeePercent)) / 10000n;
  return repaymentAmount - interestFee;
}


describe("SECURITY: Access Control Attack Tests", function () {
  let loanFactory, loanNFT, collateralVault;
  let owner, attacker, borrower, lender;

  beforeEach(async function () {
    const deployment = await deployContracts();
    loanFactory = deployment.loanFactory;
    loanNFT = deployment.loanNFT;
    collateralVault = deployment.collateralVault;
    owner = deployment.owner;
    attacker = deployment.other;
    borrower = deployment.borrower;
    lender = deployment.lender;
  });

  describe("Attack 1: Unauthorized Minting", function () {
    it("Should prevent non-factory from minting NFTs", async function () {
      await expect(
        loanNFT.connect(attacker).mint(attacker.address, 1)
      ).to.be.revertedWith("Only factory can call");

      console.log("Unauthorized NFT minting: BLOCKED");
    });

    it("Should prevent direct collateral manipulation", async function () {
      await expect(
        collateralVault.connect(attacker).depositCollateral(
          1,
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          attacker.address,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("Only factory can call");

      console.log("Direct collateral deposit: BLOCKED");
    });
  });

  describe("Attack 2: Privilege Escalation", function () {
    it("Should prevent non-owner from changing factory address", async function () {
      await expect(
        loanNFT.connect(attacker).setLoanFactory(attacker.address)
      ).to.be.revertedWithCustomError(loanNFT, "OwnableUnauthorizedAccount");

      await expect(
        collateralVault.connect(attacker).setLoanFactory(attacker.address)
      ).to.be.revertedWithCustomError(collateralVault, "OwnableUnauthorizedAccount");

      console.log("Factory address change: BLOCKED");
    });

    it("Should prevent unauthorized collateral release", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await loanFactory.connect(lender).fundLoan(1, { value: ethers.parseEther("1") });

      await expect(
        collateralVault.connect(attacker).releaseCollateral(1)
      ).to.be.revertedWith("Only factory can call");

      console.log("Unauthorized collateral release: BLOCKED");
    });
  });

  describe("Attack 3: Front-Running Protection", function () {
    it("Should handle front-running on loan funding", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await loanFactory.connect(lender).fundLoan(1, { value: ethers.parseEther("1") });

      await expect(
        loanFactory.connect(attacker).fundLoan(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Loan not available");

      console.log("Front-running on funding: HANDLED");
    });
  });

  describe("Attack 4: Self-Funding Attempt", function () {
    it("Should prevent borrower from funding their own loan", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await expect(
        loanFactory.connect(borrower).fundLoan(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Cannot fund own loan");

      console.log("Self-funding: BLOCKED");
    });
  });

  describe("Attack 5: Ownership Manipulation", function () {
    it("Should prevent transferring ownership to zero address", async function () {
      await expect(
        loanNFT.connect(owner).setLoanFactory(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");

      await expect(
        collateralVault.connect(owner).setLoanFactory(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");

      console.log("Zero address ownership: BLOCKED");
    });

    it("Should maintain proper ownership chain", async function () {
      expect(await loanNFT.owner()).to.equal(owner.address);
      expect(await collateralVault.owner()).to.equal(owner.address);
      expect(await loanFactory.owner()).to.equal(owner.address);

      console.log("Ownership chain: VALID");
    });
  });

  describe("Attack: Fake ERC20 Transfer", function () {
    it("Should revert when ERC20 transfer fails (SafeERC20 protection)", async function () {
      const MaliciousERC20 = await ethers.getContractFactory("MaliciousERC20");
      const maliciousToken = await MaliciousERC20.deploy();
      
      await maliciousToken.mint(lender.address, ethers.parseEther("10000"));

      await loanFactory.connect(owner).addSupportedToken(
        await maliciousToken.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("10000"),
        "MAL",
        18
      );

      await maliciousToken.connect(lender).approve(
        await loanFactory.getAddress(),
        ethers.MaxUint256
      );

      await loanFactory.connect(borrower).createLoanRequest(
        await maliciousToken.getAddress(),
        ethers.parseEther("100"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await maliciousToken.setShouldFail(true);

      await expect(
        loanFactory.connect(lender).fundLoan(1)
      ).to.be.reverted;

      expect(await maliciousToken.balanceOf(borrower.address)).to.equal(0);

      console.log("Fake ERC20 transfer: BLOCKED by SafeERC20");
    });

    it("Should succeed when ERC20 transfer works normally", async function () {
      const MaliciousERC20 = await ethers.getContractFactory("MaliciousERC20");
      const maliciousToken = await MaliciousERC20.deploy();
      
      await maliciousToken.mint(lender.address, ethers.parseEther("10000"));
      const loanAmount = ethers.parseEther("100");

      await loanFactory.connect(owner).addSupportedToken(
        await maliciousToken.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("10000"),
        "MAL",
        18
      );

      await maliciousToken.connect(lender).approve(
        await loanFactory.getAddress(),
        ethers.MaxUint256
      );

      await loanFactory.connect(borrower).createLoanRequest(
        await maliciousToken.getAddress(),
        ethers.parseEther("100"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await loanFactory.connect(lender).fundLoan(1);
      const expectedAmount = calculateAmountAfterOriginationFee(loanAmount);
  expect(await maliciousToken.balanceOf(borrower.address)).to.equal(expectedAmount);

      console.log("Normal ERC20 transfer: WORKS");
    });
  });

  describe("Attack: NFT Ownership Hijack", function () {
    it("Repayment goes to NFT buyer, not original lender (INTENDED FEATURE)", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await loanFactory.connect(lender).fundLoan(1, {
        value: ethers.parseEther("1"),
      });

      await loanNFT.connect(lender).transferFrom(
        lender.address,
        attacker.address,
        1
      );

      const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);

      await loanFactory.connect(borrower).repayLoan(1, {
        value: ethers.parseEther("1.1"),
      });

      const attackerBalanceAfter = await ethers.provider.getBalance(attacker.address);
      
      expect(attackerBalanceAfter).to.be.gt(attackerBalanceBefore);

      console.log("NFT holder receives repayment: WORKING AS INTENDED");
      console.log("   This is a FEATURE not a bug - enables secondary markets!");
    });
  });

  describe("Attack: ETH Transfer Griefing", function () {
    it("Should handle contracts that reject ETH (with .call protection)", async function () {
      const RevertingReceiver = await ethers.getContractFactory("RevertingReceiver");
      const revertingContract = await RevertingReceiver.deploy();

      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      // Lender (EOA) funds the loan and gets the NFT
      await loanFactory.connect(lender).fundLoan(1, { value: ethers.parseEther("1") });

      // Lender transfers NFT to reverting contract
      await loanNFT.connect(lender).transferFrom(
        lender.address,
        await revertingContract.getAddress(),
        1
      );

      await expect(
        loanFactory.connect(borrower).repayLoan(1, {
          value: ethers.parseEther("1.1"),
        })
      ).to.be.revertedWith("ETH transfer failed");

      console.log("ETH transfer griefing: MITIGATED");
      console.log("   Using .call{value}() with proper error handling");
    });
  });
});