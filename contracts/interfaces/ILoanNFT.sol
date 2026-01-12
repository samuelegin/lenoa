// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILoanNFT {
    function mint(address to, uint256 loanId) external returns (uint256);
    function burn(uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}