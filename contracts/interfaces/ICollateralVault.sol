// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICollateralVault {
    function depositCollateral(
        uint256 loanId,
        address token,
        uint256 amount,
        address depositor
    ) external payable;
    
    function releaseCollateral(uint256 loanId) external;
    function liquidateCollateral(uint256 loanId, address recipient) external;
}