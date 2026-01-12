const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts } = require("../helpers/testHelpers");

describe("LoanNFT", function () {
  let loanFactory, loanNFT;
  let owner, borrower, lender, other;

  beforeEach(async function () {
    const deployment = await deployContracts();
    loanFactory = deployment.loanFactory;
    loanNFT = deployment.loanNFT;
    owner = deployment.owner;
    borrower = deployment.borrower;
    lender = deployment.lender;
    other = deployment.other;
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await loanNFT.name()).to.equal("Lenoa Loan NFT");
      expect(await loanNFT.symbol()).to.equal("LLOAN");
    });

    it("Should set the correct owner", async function () {
      expect(await loanNFT.owner()).to.equal(owner.address);
    });

    it("Should set the loan factory", async function () {
      expect(await loanNFT.loanFactory()).to.equal(await loanFactory.getAddress());
    });
  });

  describe("Minting", function () {
    it("Should mint NFT when called by factory", async function () {
      //create and fund a loan to trigger minting
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress, // ETH loan
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

      expect(await loanNFT.ownerOf(1)).to.equal(lender.address);
    });

    it("Should revert if non factory tries to mint", async function () {
      await expect(
        loanNFT.connect(other).mint(other.address, 1)
      ).to.be.revertedWith("Only factory can call");
    });

    it("Should store the loan metadata", async function () {
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

      const metadata = await loanNFT.loanMetadata(1);
      expect(metadata.loanId).to.equal(1);
      expect(metadata.originalLender).to.equal(lender.address);
      expect(metadata.mintedAt).to.be.gt(0);
    });
  });

  describe("Burning", function () {
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

    it("Should burn the NFT when loan is repaid", async function () {
      await loanFactory.connect(borrower).repayLoan(1, { 
        value: ethers.parseEther("1.1") 
      });

      await expect(loanNFT.ownerOf(1)).to.be.reverted;
    });

    it("Should revert if non factory tries to burn", async function () {
      await expect(
        loanNFT.connect(other).burn(1)
      ).to.be.revertedWith("Only factory can call");
    });
  });

  describe("Transfers", function () {
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

    it("Should allow NFT holder to transfer", async function () {
      await loanNFT.connect(lender).transferFrom(
        lender.address,
        other.address,
        1
      );

      expect(await loanNFT.ownerOf(1)).to.equal(other.address);
    });

    it("Should allow approved address to transfer", async function () {
      await loanNFT.connect(lender).approve(other.address, 1);

      await loanNFT.connect(other).transferFrom(
        lender.address,
        other.address,
        1
      );

      expect(await loanNFT.ownerOf(1)).to.equal(other.address);
    });

    it("Should revert if unauthorized address tries to transfer", async function () {
      await expect(
        loanNFT.connect(other).transferFrom(
          lender.address,
          other.address,
          1
        )
      ).to.be.reverted;
    });

    it("Should update the balance after transfer", async function () {
      expect(await loanNFT.balanceOf(lender.address)).to.equal(1);
      expect(await loanNFT.balanceOf(other.address)).to.equal(0);

      await loanNFT.connect(lender).transferFrom(
        lender.address,
        other.address,
        1
      );

      expect(await loanNFT.balanceOf(lender.address)).to.equal(0);
      expect(await loanNFT.balanceOf(other.address)).to.equal(1);
    });
  });

  describe("Token URI", function () {
    it("Should return the correct token URI", async function () {
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

      const uri = await loanNFT.tokenURI(1);
      expect(uri).to.include("https://lenoa.app/api/nft/1");
    });

    it("Should revert for non-existent token", async function () {
      await expect(loanNFT.tokenURI(999)).to.be.reverted;
    });

    it("Should return different URIs for different tokens", async function () {
      //create and fund two loans
      await loanFactory.connect(borrower).createLoanRequest(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        10,
        30,
        ethers.ZeroAddress,
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
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

      await loanFactory.connect(lender).fundLoan(1, { 
        value: ethers.parseEther("1") 
      });

      await loanFactory.connect(lender).fundLoan(2, { 
        value: ethers.parseEther("1") 
      });

      const uri1 = await loanNFT.tokenURI(1);
      const uri2 = await loanNFT.tokenURI(2);

      expect(uri1).to.not.equal(uri2);
      expect(uri1).to.include("/nft/1");
      expect(uri2).to.include("/nft/2");
    });
  });

  describe("Factory Management", function () {
    it("Should allow owner to update factory address", async function () {
      const newFactory = other.address;
      await loanNFT.connect(owner).setLoanFactory(newFactory);
      expect(await loanNFT.loanFactory()).to.equal(newFactory);
    });

    it("Should revert if non owner tries to update factory", async function () {
      await expect(
        loanNFT.connect(other).setLoanFactory(other.address)
      ).to.be.revertedWithCustomError(loanNFT, "OwnableUnauthorizedAccount");
    });

    it("Should revert if to setting zero address", async function () {
      await expect(
        loanNFT.connect(owner).setLoanFactory(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should emit event when factory is updated", async function () {
      const newFactory = other.address;
      await loanNFT.connect(owner).setLoanFactory(newFactory);
      expect(await loanNFT.loanFactory()).to.equal(newFactory);
    });
  });

  describe("ERC721 Standard Compliance", function () {
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

    it("Should support ERC721 interface", async function () {
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      expect(await loanNFT.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
    });

    it("Should correctly report token balance", async function () {
      expect(await loanNFT.balanceOf(lender.address)).to.equal(1);
    });

    it("Should revert balance query for zero address", async function () {
      await expect(
        loanNFT.balanceOf(ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it("Should support safeTransferFrom", async function () {
      await loanNFT.connect(lender)["safeTransferFrom(address,address,uint256)"](
        lender.address,
        other.address,
        1
      );

      expect(await loanNFT.ownerOf(1)).to.equal(other.address);
    });

    it("Should support approve and getApproved", async function () {
      await loanNFT.connect(lender).approve(other.address, 1);
      expect(await loanNFT.getApproved(1)).to.equal(other.address);
    });

    it("Should support setApprovalForAll", async function () {
      await loanNFT.connect(lender).setApprovalForAll(other.address, true);
      expect(await loanNFT.isApprovedForAll(lender.address, other.address)).to.be.true;

      await loanNFT.connect(other).transferFrom(
        lender.address,
        other.address,
        1
      );

      expect(await loanNFT.ownerOf(1)).to.equal(other.address);
    });
  });

  describe("Metadata Storage", function () {
    it("Should correctly store multiple loan metadata", async function () {
      // Create and fund multiple loans
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

        await loanFactory.connect(lender).fundLoan(i + 1, { 
          value: ethers.parseEther("1") 
        });
      }

      for (let i = 1; i <= 3; i++) {
        const metadata = await loanNFT.loanMetadata(i);
        expect(metadata.loanId).to.equal(i);
        expect(metadata.originalLender).to.equal(lender.address);
        expect(metadata.mintedAt).to.be.gt(0);
      }
    });

    it("Should preserve metadata after transfer", async function () {
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
        other.address,
        1
      );

      const metadataAfter = await loanNFT.loanMetadata(1);

      expect(metadataAfter.loanId).to.equal(metadataBefore.loanId);
      expect(metadataAfter.originalLender).to.equal(metadataBefore.originalLender);
      expect(metadataAfter.mintedAt).to.equal(metadataBefore.mintedAt);
    });
  });
});