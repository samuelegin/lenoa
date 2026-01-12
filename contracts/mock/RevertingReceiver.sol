// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RevertingReceiver
 * @dev A contract that reverts when receiving ETH
 * Used to test ETH transfer griefing protection
 */
contract RevertingReceiver {
    // This contract will revert when receiving ETH via .transfer() or .send()
    // But will work with .call{value: }("")
    
    receive() external payable {
        revert("I don't accept ETH!");
    }

    fallback() external payable {
        revert("I don't accept ETH!");
    }

    // Function to fund a loan (becomes the lender)
    function fund(address loanFactory, uint256 loanId) external payable {
        (bool success, ) = loanFactory.call{value: msg.value}(
            abi.encodeWithSignature("fundLoan(uint256)", loanId)
        );
        require(success, "Funding failed");
    }
}