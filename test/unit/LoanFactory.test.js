const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  deployContracts,
  calculateRepaymentAmount,
  timeTravel,
  SEPOLIA_TOKENS
} = require("../helpers/testHelpers");

function calculateAmountAfterOriginationFee(loanAmount, feePercent = 50) {
  const fee = (loanAmount * BigInt(feePercent)) / 10000n;
  return loanAmount - fee;
}

function calculateLenderReceivesAfterInterestFee(repaymentAmount, loanAmount, interestFeePercent = 500) {
  const interest = repaymentAmount - loanAmount;
  const interestFee = (interest * BigInt(interestFeePercent)) / 10000n;
  return repaymentAmount - interestFee;
}

describe("LoanFactory", function () {
  let loanFactory, loanNFT, collateralVault;
  let owner, borrower, lender, other;
  let mockDAI, mockUSDC, mockLINK;

  beforeEach(async function () {
    const deployment = await deployContracts();
    loanFactory = deployment.loanFactory;
    loanNFT = deployment.loanNFT;
    collateralVault = deployment.collateralVault;
    owner = deployment.owner;
    borrower = deployment.borrower;
    lender = deployment.lender;
    other = deployment.other;
    mockDAI = deployment.mockDAI;
    mockUSDC = deployment.mockUSDC;
    mockLINK = deployment.mockLINK;

    await mockDAI.mint(borrower.address, ethers.parseEther("100000"));
    await mockDAI.mint(lender.address, ethers.parseEther("100000"));
    await mockUSDC.mint(borrower.address, ethers.parseUnits("100000", 6));
    await mockUSDC.mint(lender.address, ethers.parseUnits("100000", 6));
    await mockLINK.mint(borrower.address, ethers.parseEther("100000"));
    await mockLINK.mint(lender.address, ethers.parseEther("100000"));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await loanFactory.owner()).to.equal(owner.address);
    });

    it("Should have correct contract addresses", async function () {
      expect(await loanFactory.loanNFT()).to.equal(await loanNFT.getAddress());
      expect(await loanFactory.collateralVault()).to.equal(await collateralVault.getAddress());
    });

    it("Should initialize supported tokens", async function () {
      const daiConfig = await loanFactory.supportedTokens(SEPOLIA_TOKENS.DAI);
      expect(daiConfig.enabled).to.be.true;
      expect(daiConfig.symbol).to.equal("DAI");
      expect(daiConfig.decimals).to.equal(18);
    });

    it("Should start with nextLoanId = 1", async function () {
      expect(await loanFactory.nextLoanId()).to.equal(1);
    });
  });

  describe("Create Loan Request", function () {
    it("Should create a loan request with ETH collateral", async function () {
      const loanAmount = ethers.parseEther("1000");
      const collateralAmount = ethers.parseEther("0.5");
      const interestRate = 10;
      const durationDays = 30;

      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          loanAmount,
          interestRate,
          durationDays,
          SEPOLIA_TOKENS.ETH,
          collateralAmount,
          { value: collateralAmount }
        )
      ).to.emit(loanFactory, "LoanRequestCreated");

      const loan = await loanFactory.loans(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.loanAmount).to.equal(loanAmount);
      expect(loan.repaymentAmount).to.equal(calculateRepaymentAmount(loanAmount, interestRate));
      expect(loan.status).to.equal(0); // PENDING
    });

    it("Should create a loan request with ERC20 collateral", async function () {
      const loanAmount = ethers.parseEther("1000");
      const collateralAmount = ethers.parseEther("0.5");
      const interestRate = 12;
      const durationDays = 14;

      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          loanAmount,
          interestRate,
          durationDays,
          SEPOLIA_TOKENS.ETH,
          collateralAmount,
          { value: collateralAmount }
        )
      ).to.emit(loanFactory, "LoanRequestCreated");

      const loan = await loanFactory.loans(1);
      expect(loan.collateralToken).to.equal(SEPOLIA_TOKENS.ETH);
      expect(loan.collateralAmount).to.equal(collateralAmount);
    });

    it("Should revert if the loan amount is too low", async function () {
      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("50"),
          10,
          30,
          SEPOLIA_TOKENS.ETH,
          ethers.parseEther("0.1"),
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("Amount too low");
    });

    it("Should revert if the loan amount is too high", async function () {
      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("20000"),
          10,
          30,
          SEPOLIA_TOKENS.ETH,
          ethers.parseEther("5"),
          { value: ethers.parseEther("5") }
        )
      ).to.be.revertedWith("Amount too high");
    });

    it("Should revert if interest rate is not valid", async function () {
      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("1000"),
          0,
          30,
          SEPOLIA_TOKENS.ETH,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWith("Invalid interest rate");

      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("1000"),
          60,
          30,
          SEPOLIA_TOKENS.ETH,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWith("Invalid interest rate");
    });

    it("Should revert if the duration is not valid", async function () {
      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("1000"),
          10,
          100,
          SEPOLIA_TOKENS.ETH,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWith("Invalid duration");
    });

    it("Should revert if thecollateral amount is zero", async function () {
      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("1000"),
          10,
          30,
          SEPOLIA_TOKENS.ETH,
          0,
          { value: 0 }
        )
      ).to.be.revertedWith("Collateral required");
    });

    it("Should revert if ETH sent doesn't match the collateral amount", async function () {
      await expect(
        loanFactory.connect(borrower).createLoanRequest(
          SEPOLIA_TOKENS.DAI,
          ethers.parseEther("1000"),
          10,
          30,
          SEPOLIA_TOKENS.ETH,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.3") }
        )
      ).to.be.revertedWith("Incorrect ETH amount");
    });

    it("Should track borrower loans", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        SEPOLIA_TOKENS.DAI,
        ethers.parseEther("1000"),
        10,
        30,
        SEPOLIA_TOKENS.ETH,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      const borrowerLoans = await loanFactory.getBorrowerLoans(borrower.address);
      expect(borrowerLoans.length).to.equal(1);
      expect(borrowerLoans[0]).to.equal(1);
    });
  });

  describe("Fund Loan", function () {
    let loanId;
    const loanAmount = ethers.parseEther("1");
    const collateralAmount = ethers.parseEther("0.5");

    beforeEach(async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        loanAmount,
        10,
        30,
        ethers.ZeroAddress,
        collateralAmount,
        { value: collateralAmount }
      );
      loanId = 1;
    });

   it("Should fund a loan with ETH", async function () {
    const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);

    await expect(
      loanFactory.connect(lender).fundLoan(loanId, { value: loanAmount })
    ).to.emit(loanFactory, "LoanFunded");

    const loan = await loanFactory.loans(loanId);
    expect(loan.lender).to.equal(lender.address);
    expect(loan.status).to.equal(1);
    expect(loan.deadline).to.be.gt(0);

    const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);
    
    const expectedAmount = calculateAmountAfterOriginationFee(loanAmount);
    expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(expectedAmount);

    expect(await loanNFT.ownerOf(loanId)).to.equal(lender.address);
  });

    it("Should revert if loan is not pending", async function () {
      await loanFactory.connect(lender).fundLoan(loanId, { value: loanAmount });

      await expect(
        loanFactory.connect(other).fundLoan(loanId, { value: loanAmount })
      ).to.be.revertedWith("Loan not available");
    });

    it("Should revert if a borrower tries to fund own loan", async function () {
      await expect(
        loanFactory.connect(borrower).fundLoan(loanId, { value: loanAmount })
      ).to.be.revertedWith("Cannot fund own loan");
    });

    it("Should track lender loans", async function () {
      await loanFactory.connect(lender).fundLoan(loanId, { value: loanAmount });

      const lenderLoans = await loanFactory.getLenderLoans(lender.address);
      expect(lenderLoans.length).to.equal(1);
      expect(lenderLoans[0]).to.equal(loanId);
    });
  });

  describe("Repay Loan", function () {
    let loanId;
    const loanAmount = ethers.parseEther("1");
    const interestRate = 10;
    const repaymentAmount = calculateRepaymentAmount(loanAmount, interestRate);
    const collateralAmount = ethers.parseEther("0.5");

    beforeEach(async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        loanAmount,
        interestRate,
        30,
        ethers.ZeroAddress,
        collateralAmount,
        { value: collateralAmount }
      );
      loanId = 1;

      await loanFactory.connect(lender).fundLoan(loanId, { value: loanAmount });
    });

    it("Should repay a loan with ETH", async function () {
    const lenderBalanceBefore = await ethers.provider.getBalance(lender.address);

    await expect(
      loanFactory.connect(borrower).repayLoan(loanId, { value: repaymentAmount })
    ).to.emit(loanFactory, "LoanRepaid");

    const loan = await loanFactory.loans(loanId);
    expect(loan.status).to.equal(2);

    const lenderBalanceAfter = await ethers.provider.getBalance(lender.address);
    
    const expectedAmount = calculateLenderReceivesAfterInterestFee(repaymentAmount, loanAmount);
    expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(expectedAmount);

    await expect(loanNFT.ownerOf(loanId)).to.be.reverted;
  });

     it("Should repay loan to current NFT holder if transferred", async function () {
    await loanNFT.connect(lender).transferFrom(lender.address, other.address, loanId);

    const otherBalanceBefore = await ethers.provider.getBalance(other.address);

    await loanFactory.connect(borrower).repayLoan(loanId, { value: repaymentAmount });

    const otherBalanceAfter = await ethers.provider.getBalance(other.address);
    
    const expectedAmount = calculateLenderReceivesAfterInterestFee(repaymentAmount, loanAmount);
    expect(otherBalanceAfter - otherBalanceBefore).to.equal(expectedAmount);
  });

    it("Should revert if the loan is not active", async function () {
      await loanFactory.connect(borrower).repayLoan(loanId, { value: repaymentAmount });

      await expect(
        loanFactory.connect(borrower).repayLoan(loanId, { value: repaymentAmount })
      ).to.be.revertedWith("Loan not active");
    });

    it("Should revert if non borrower tries to repay", async function () {
      await expect(
        loanFactory.connect(other).repayLoan(loanId, { value: repaymentAmount })
      ).to.be.revertedWith("Only borrower can repay");
    });

    it("Should revert if repayment amount is incorrect", async function () {
      await expect(
        loanFactory.connect(borrower).repayLoan(loanId, { 
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("Incorrect repayment amount");
    });

    it("Should revert if theloan is past deadline", async function () {
      await timeTravel(31 * 24 * 60 * 60);

      await expect(
        loanFactory.connect(borrower).repayLoan(loanId, { value: repaymentAmount })
      ).to.be.revertedWith("Loan defaulted");
    });
  });

  describe("Liquidate Loan", function () {
    let loanId;
    const loanAmount = ethers.parseEther("1");
    const collateralAmount = ethers.parseEther("0.5");

    beforeEach(async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        loanAmount,
        10,
        30,
        ethers.ZeroAddress,
        collateralAmount,
        { value: collateralAmount }
      );
      loanId = 1;

      await loanFactory.connect(lender).fundLoan(loanId, { value: loanAmount });
    });

    it("Should liquidate a defaulted loan", async function () {
      await timeTravel(31 * 24 * 60 * 60);

      const nftHolderBalanceBefore = await ethers.provider.getBalance(lender.address);

      await expect(
        loanFactory.connect(other).liquidateLoan(loanId)
      ).to.emit(loanFactory, "LoanDefaulted");

      const loan = await loanFactory.loans(loanId);
      expect(loan.status).to.equal(3);

      const nftHolderBalanceAfter = await ethers.provider.getBalance(lender.address);
      expect(nftHolderBalanceAfter - nftHolderBalanceBefore).to.equal(collateralAmount);
    });

    it("Should liquidate to current NFT holder if transferred", async function () {
      await loanNFT.connect(lender).transferFrom(lender.address, other.address, loanId);

      await timeTravel(31 * 24 * 60 * 60);

      const otherBalanceBefore = await ethers.provider.getBalance(other.address);

      await loanFactory.liquidateLoan(loanId);

      const otherBalanceAfter = await ethers.provider.getBalance(other.address);
      expect(otherBalanceAfter).to.be.gte(otherBalanceBefore);
    });

    it("Should revert if the loan is not active", async function () {
      await timeTravel(31 * 24 * 60 * 60);
      await loanFactory.liquidateLoan(loanId);

      await expect(
        loanFactory.liquidateLoan(loanId)
      ).to.be.revertedWith("Loan not active");
    });

    it("Should revert if loan is not past deadline", async function () {
      await expect(
        loanFactory.liquidateLoan(loanId)
      ).to.be.revertedWith("Loan not defaulted yet");
    });
  });

  describe("Cancel Loan", function () {
    let loanId;
    const collateralAmount = ethers.parseEther("0.5");

    beforeEach(async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        SEPOLIA_TOKENS.DAI,
        ethers.parseEther("1000"),
        10,
        30,
        SEPOLIA_TOKENS.ETH,
        collateralAmount,
        { value: collateralAmount }
      );
      loanId = 1;
    });

    it("Should cancel a pending loan", async function () {
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);

      await expect(
        loanFactory.connect(borrower).cancelLoan(loanId)
      ).to.emit(loanFactory, "LoanCancelled");

      const loan = await loanFactory.loans(loanId);
      expect(loan.status).to.equal(4);

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);
      expect(borrowerBalanceAfter).to.be.gt(borrowerBalanceBefore);
    });

    it("Should revert if a loan is not pending", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        collateralAmount,
        { value: collateralAmount }
      );

      await loanFactory.connect(lender).fundLoan(2, { 
        value: ethers.parseEther("1")
      });

      await expect(
        loanFactory.connect(borrower).cancelLoan(2)
      ).to.be.revertedWith("Loan not pending");
    });

    it("Should revert if a non borrower tries to cancel", async function () {
      await expect(
        loanFactory.connect(other).cancelLoan(loanId)
      ).to.be.revertedWith("Only borrower can cancel");
    });
  });

  describe("View Functions", function () {
    it("Should get the loan details", async function () {
      await loanFactory.connect(borrower).createLoanRequest(
        SEPOLIA_TOKENS.DAI,
        ethers.parseEther("1000"),
        10,
        30,
        SEPOLIA_TOKENS.ETH,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );

      const loan = await loanFactory.getLoan(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.loanAmount).to.equal(ethers.parseEther("1000"));
    });

    it("Should check if the token is supported", async function () {
      expect(await loanFactory.isTokenSupported(SEPOLIA_TOKENS.DAI)).to.be.true;
      expect(await loanFactory.isTokenSupported(ethers.ZeroAddress)).to.be.true;
      expect(await loanFactory.isTokenSupported(await mockDAI.getAddress())).to.be.false;
    });
  });
}); 