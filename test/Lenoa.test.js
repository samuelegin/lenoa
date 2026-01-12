const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, timeTravel } = require("./helpers/testHelpers");

describe("Lenoa - Integration Tests", function () {
  let loanFactory, loanNFT, collateralVault;
  let owner, borrower, lender, trader;

  beforeEach(async function () {
    const deployment = await deployContracts();
    loanFactory = deployment.loanFactory;
    loanNFT = deployment.loanNFT;
    collateralVault = deployment.collateralVault;
    owner = deployment.owner;
    borrower = deployment.borrower;
    lender = deployment.lender;
    trader = deployment.other;
  });

  describe("Full Loan Lifecycle", function () {
    it("Should complete entire loan lifecycle successfully (create, fund, repay)", async function () {
      const loanAmount = ethers.parseEther("1");
      const interestRate = 10;
      const repaymentAmount = ethers.parseEther("1.1");
      const collateralAmount = ethers.parseEther("0.5");

      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        loanAmount,
        interestRate,
        30,
        ethers.ZeroAddress,
        collateralAmount,
        { value: collateralAmount }
      );

      let loan = await loanFactory.loans(1);
      expect(loan.status).to.equal(0);
      expect(loan.borrower).to.equal(borrower.address);
      await loanFactory.connect(lender).fundLoan(1, { value: loanAmount });

      loan = await loanFactory.loans(1);
      expect(loan.status).to.equal(1); // ACTIVE
      expect(await loanNFT.ownerOf(1)).to.equal(lender.address);

      await loanFactory.connect(borrower).repayLoan(1, { 
        value: repaymentAmount 
      });

      loan = await loanFactory.loans(1);
      expect(loan.status).to.equal(2);

      await expect(loanNFT.ownerOf(1)).to.be.reverted;
    });
  });

  describe("Loan NFT Trading Scenario", function () {
    it("Should route repayment to new NFT holder after trade", async function () {  
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

      await loanNFT.connect(lender).transferFrom(
        lender.address,
        trader.address,
        1
      );

      expect(await loanNFT.ownerOf(1)).to.equal(trader.address);

      const traderBalanceBefore = await ethers.provider.getBalance(
        trader.address
      );

      await loanFactory.connect(borrower).repayLoan(1, { 
        value: ethers.parseEther("1.1") 
      });

      const traderBalanceAfter = await ethers.provider.getBalance(
        trader.address
      );

      expect(traderBalanceAfter - traderBalanceBefore).to.equal(
        ethers.parseEther("1.095")
      );
    });
  });

  describe("Default and Liquidation Scenario", function () {
    it("Should liquidate collateral to NFT holder on default", async function () {
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

      await timeTravel(2 * 24 * 60 * 60);

      const lenderBalanceBefore = await ethers.provider.getBalance(
        lender.address
      );

      await loanFactory.connect(trader).liquidateLoan(1);

      const lenderBalanceAfter = await ethers.provider.getBalance(
        lender.address
      );

      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(
        ethers.parseEther("0.5")
      );

      const loan = await loanFactory.loans(1);
      expect(loan.status).to.equal(3);
    });
  });

  describe("Multiple Loans Management", function () {
    it("Should track multiple loans for borrower and lender", async function () {
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

      const borrowerLoans = await loanFactory.getBorrowerLoans(
        borrower.address
      );
      expect(borrowerLoans.length).to.equal(3);
      for (let i = 1; i <= 3; i++) {
        await loanFactory.connect(lender).fundLoan(i, { 
          value: ethers.parseEther("1") 
        });
      }

      const lenderLoans = await loanFactory.getLenderLoans(lender.address);
      expect(lenderLoans.length).to.equal(3);

      for (let i = 1; i <= 3; i++) {
        expect(await loanNFT.ownerOf(i)).to.equal(lender.address);
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle loan cancellation", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      const borrowerBalanceBefore = await ethers.provider.getBalance(
        borrower.address
      );

      await loanFactory.connect(borrower).cancelLoan(1);

      const borrowerBalanceAfter = await ethers.provider.getBalance(
        borrower.address
      );

      expect(borrowerBalanceAfter).to.be.gt(
        borrowerBalanceBefore - ethers.parseEther("0.1")
      );

      const loan = await loanFactory.loans(1);
      expect(loan.status).to.equal(4);
    });

    it("Should prevent double funding", async function () {
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

      await expect(
        loanFactory.connect(trader).fundLoan(1, { 
          value: ethers.parseEther("1") 
        })
      ).to.be.revertedWith("Loan not available");
    });

    it("Should prevent repayment after default", async function () {
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

      await timeTravel(2 * 24 * 60 * 60);

      await expect(
        loanFactory.connect(borrower).repayLoan(1, { 
          value: ethers.parseEther("1.1") 
        })
      ).to.be.revertedWith("Loan defaulted");
    });
  });

  describe("NFT Trading and Secondary Market", function () {
    it("Should allow multiple NFT transfers", async function () {
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

      await loanNFT.connect(lender).transferFrom(
        lender.address,
        trader.address,
        1
      );
      expect(await loanNFT.ownerOf(1)).to.equal(trader.address);

      await loanNFT.connect(trader).transferFrom(
        trader.address,
        owner.address,
        1
      );
      expect(await loanNFT.ownerOf(1)).to.equal(owner.address);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await loanFactory.connect(borrower).repayLoan(1, { 
        value: ethers.parseEther("1.1") 
      });

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(
        ethers.parseEther("1.095")
      );
    });

    it("Should maintain NFT metadata after transfers", async function () {
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

      const metadataBefore = await loanNFT.loanMetadata(1);

      await loanNFT.connect(lender).transferFrom(
        lender.address,
        trader.address,
        1
      );

      const metadataAfter = await loanNFT.loanMetadata(1);

      expect(metadataAfter.loanId).to.equal(metadataBefore.loanId);
      expect(metadataAfter.originalLender).to.equal(metadataBefore.originalLender);
      expect(metadataAfter.mintedAt).to.equal(metadataBefore.mintedAt);
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle partial portfolio liquidation", async function () {
      for (let i = 0; i < 3; i++) {
        const duration = i === 0 ? 1 : 30;
        await loanFactory.connect(borrower).createLoanRequest(
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          10,
          duration,
          ethers.ZeroAddress,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        );

        await loanFactory.connect(lender).fundLoan(i + 1, { 
          value: ethers.parseEther("1") 
        });
      }

      await timeTravel(2 * 24 * 60 * 60);

      await loanFactory.liquidateLoan(1);

      const loan1 = await loanFactory.loans(1);
      expect(loan1.status).to.equal(3);

      const loan2 = await loanFactory.loans(2);
      const loan3 = await loanFactory.loans(3);
      expect(loan2.status).to.equal(1);
      expect(loan3.status).to.equal(1);

      await loanFactory.connect(borrower).repayLoan(2, { 
        value: ethers.parseEther("1.1") 
      });

      const loan2After = await loanFactory.loans(2);
      expect(loan2After.status).to.equal(2);
    });
  });
});