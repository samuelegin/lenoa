const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, deployMockERC20, SEPOLIA_TOKENS } = require("../helpers/testHelpers");

describe("CollateralVault", function () {
  let loanFactory, loanNFT, collateralVault;
  let owner, borrower, lender, other;
  let mockDAI;

  beforeEach(async function () {
    const deployment = await deployContracts();
    loanFactory = deployment.loanFactory;
    loanNFT = deployment.loanNFT;
    collateralVault = deployment.collateralVault;
    owner = deployment.owner;
    borrower = deployment.borrower;
    lender = deployment.lender;
    other = deployment.other;

    mockDAI = await deployMockERC20("Mock DAI", "mDAI", 18);
    await mockDAI.mint(borrower.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await collateralVault.owner()).to.equal(owner.address);
    });

    it("Should set the loan factory", async function () {
      expect(await collateralVault.loanFactory()).to.equal(
        await loanFactory.getAddress()
      );
    });
  });

  describe("Deposit Collateral", function () {
    it("Should deposit ETH collateral", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      const deposit = await collateralVault.deposits(1);
      expect(deposit.token).to.equal(ethers.ZeroAddress);
      expect(deposit.amount).to.equal(ethers.parseEther("0.5"));
      expect(deposit.depositor).to.equal(borrower.address);
      expect(deposit.released).to.be.false;
    });

    it("Should hold the collateral in vault", async function () {
      const vaultBalanceBefore = await ethers.provider.getBalance(
        await collateralVault.getAddress()
      );

      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      const vaultBalanceAfter = await ethers.provider.getBalance(
        await collateralVault.getAddress()
      );

      expect(vaultBalanceAfter - vaultBalanceBefore).to.equal(
        ethers.parseEther("0.5")
      );
    });
  });

  describe("Release Collateral", function () {
    beforeEach(async function () {
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
        value: ethers.parseEther("1") 
      });
    });

    it("Should release collateral to borrower on repayment", async function () {
      const borrowerBalanceBefore = await ethers.provider.getBalance(
        borrower.address
      );

      await loanFactory.connect(borrower).repayLoan(1, { 
        value: ethers.parseEther("1.1") 
      });

      const borrowerBalanceAfter = await ethers.provider.getBalance(
        borrower.address
      );

      expect(borrowerBalanceAfter).to.be.gt(
        borrowerBalanceBefore - ethers.parseEther("1.2")
      );

      const deposit = await collateralVault.deposits(1);
      expect(deposit.released).to.be.true;
    });

    it("Should revert if already released", async function () {
      await loanFactory.connect(borrower).repayLoan(1, { 
        value: ethers.parseEther("1.1") 
      });

      await expect(
        collateralVault.releaseCollateral(1)
      ).to.be.revertedWith("Only factory can call");
    });
  });

  describe("Liquidate Collateral", function () {
    beforeEach(async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        1,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      await loanFactory.connect(lender).fundLoan(1, { 
        value: ethers.parseEther("1") 
      });
    });

    it("Should liquidate collateral to NFT holder on default", async function () {
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const lenderBalanceBefore = await ethers.provider.getBalance(
        lender.address
      );

      await loanFactory.liquidateLoan(1);

      const lenderBalanceAfter = await ethers.provider.getBalance(
        lender.address
      );

      expect(lenderBalanceAfter - lenderBalanceBefore).to.be.gte(
        ethers.parseEther("0.4")
      );

      const deposit = await collateralVault.deposits(1);
      expect(deposit.released).to.be.true;
    });

    it("Should liquidate to current NFT holder if transferred", async function () {
      await loanNFT.connect(lender).transferFrom(
        lender.address,
        other.address,
        1
      );

      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const otherBalanceBefore = await ethers.provider.getBalance(
        other.address
      );

      await loanFactory.liquidateLoan(1);

      const otherBalanceAfter = await ethers.provider.getBalance(
        other.address
      );

      expect(otherBalanceAfter - otherBalanceBefore).to.be.gte(
        ethers.parseEther("0.4")
      );
    });
  });

  describe("Access Control", function () {
    it("Should only allow factory to deposit", async function () {
      await expect(
        collateralVault.connect(other).depositCollateral(
          1,
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          other.address,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("Only factory can call");
    });

    it("Should only allow factory to release", async function () {
      await expect(
        collateralVault.connect(other).releaseCollateral(1)
      ).to.be.revertedWith("Only factory can call");
    });

    it("Should only allow factory to liquidate", async function () {
      await expect(
        collateralVault.connect(other).liquidateCollateral(1, other.address)
      ).to.be.revertedWith("Only factory can call");
    });

    it("Should allow owner to update factory address", async function () {
      await collateralVault.connect(owner).setLoanFactory(other.address);
      expect(await collateralVault.loanFactory()).to.equal(other.address);
    });

    it("Should revert if non-owner tries to update factory", async function () {
      await expect(
        collateralVault.connect(other).setLoanFactory(other.address)
      ).to.be.revertedWithCustomError(collateralVault, "OwnableUnauthorizedAccount");
    });

    it("Should revert if setting zero address as factory", async function () {
      await expect(
        collateralVault.connect(owner).setLoanFactory(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Edge Cases", function () {
    it("Should revert if trying to release non-existent deposit", async function () {
      await expect(
        collateralVault.releaseCollateral(999)
      ).to.be.revertedWith("Only factory can call");
    });

    it("Should handle multiple deposits", async function () {
      for (let i = 0; i < 3; i++) {
        await loanFactory.connect(borrower).createLoanRequest(
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          10,
          30,
          ethers.ZeroAddress,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        );
      }

      for (let i = 1; i <= 3; i++) {
        const deposit = await collateralVault.deposits(i);
        expect(deposit.amount).to.equal(ethers.parseEther("0.5"));
        expect(deposit.depositor).to.equal(borrower.address);
      }
    });

    it("Should correctly track vault balance with multiple deposits", async function () {
      const initialBalance = await ethers.provider.getBalance(
        await collateralVault.getAddress()
      );

      for (let i = 0; i < 3; i++) {
        await loanFactory.connect(borrower).createLoanRequest(
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          10,
          30,
          ethers.ZeroAddress,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        );
      }

      const finalBalance = await ethers.provider.getBalance(
        await collateralVault.getAddress()
      );

      expect(finalBalance - initialBalance).to.equal(
        ethers.parseEther("1.5")
      );
    });
  });
});