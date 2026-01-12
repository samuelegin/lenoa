// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MaliciousERC20
 * @dev An ERC20 token that returns false instead of reverting on failed transfers
 * Used to test SafeERC20 protection
 */
contract MaliciousERC20 is ERC20 {
    bool public shouldFail;

    constructor() ERC20("Malicious Token", "MAL") {
        shouldFail = false;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }

    // Override transferFrom to return false instead of reverting
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        if (shouldFail) {
            return false; // Silent failure - SafeERC20 should catch this
        }
        return super.transferFrom(from, to, amount);
    }

    // Override transfer to return false instead of reverting
    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        if (shouldFail) {
            return false; // Silent failure - SafeERC20 should catch this
        }
        return super.transfer(to, amount);
    }
}