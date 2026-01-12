// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LoanNFT is ERC721, Ownable {
    address public loanFactory;

    struct LoanMetadata {
        uint256 loanId;
        address borrower;
        address originalLender;
        uint256 mintedAt;
    }

    mapping(uint256 => LoanMetadata) public loanMetadata;

    modifier onlyFactory() {
        require(msg.sender == loanFactory, "Only factory can call");
        _;
    }

    constructor() ERC721("Lenoa Loan NFT", "LLOAN") Ownable(msg.sender) {}

    function setLoanFactory(address _loanFactory) external onlyOwner {
        require(_loanFactory != address(0), "Invalid address");
        loanFactory = _loanFactory;
    }

    function mint(address to, uint256 loanId) external onlyFactory returns (uint256) {
        uint256 tokenId = loanId;
        _safeMint(to, tokenId);

        loanMetadata[tokenId] = LoanMetadata({
            loanId: loanId,
            borrower: address(0),
            originalLender: to,
            mintedAt: block.timestamp
        });

        return tokenId;
    }

    function burn(uint256 tokenId) external onlyFactory {
        _burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        return string(abi.encodePacked(
            "https://lenoa.app/api/nft/",
            Strings.toString(tokenId)
        ));
    }
}