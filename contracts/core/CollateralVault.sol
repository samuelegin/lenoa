// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CollateralVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public loanFactory;

    struct CollateralDeposit {
        address token;
        uint256 amount;
        address depositor;
        bool released;
    }

    mapping(uint256 => CollateralDeposit) public deposits;

    event CollateralDeposited(
        uint256 indexed loanId, 
        address indexed depositor,
        address token, 
        uint256 amount,
        uint256 timestamp
    );

    event CollateralReleased(
        uint256 indexed loanId, 
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    event CollateralLiquidated(
        uint256 indexed loanId, 
        address indexed recipient,
        address indexed defaultedBorrower,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    event FactoryUpdated(
        address indexed oldFactory, 
        address indexed newFactory,
        address indexed updatedBy,
        uint256 timestamp
    );

    modifier onlyFactory() {
        require(msg.sender == loanFactory, "Only factory can call");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setLoanFactory(address _newFactory) external onlyOwner {
        require(_newFactory != address(0), "Invalid address");
        address oldFactory = loanFactory;
        loanFactory = _newFactory;
        emit FactoryUpdated(oldFactory, _newFactory, msg.sender, block.timestamp);
    }

    function depositCollateral(
        uint256 loanId,
        address token,
        uint256 amount,
        address depositor
    ) external payable onlyFactory nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(depositor != address(0), "Invalid depositor");
        require(deposits[loanId].amount == 0, "Collateral already deposited");

        deposits[loanId] = CollateralDeposit({
            token: token,
            amount: amount,
            depositor: depositor,
            released: false
        });

        emit CollateralDeposited(loanId, depositor, token, amount, block.timestamp);
    }

    function releaseCollateral(uint256 loanId) external onlyFactory nonReentrant {
        CollateralDeposit storage deposit = deposits[loanId];
        require(!deposit.released, "Already released");
        require(deposit.amount > 0, "No collateral");

        deposit.released = true;

        if (deposit.token == address(0)) {
            (bool success, ) = payable(deposit.depositor).call{value: deposit.amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(deposit.token).safeTransfer(deposit.depositor, deposit.amount);
        }

        emit CollateralReleased(loanId, deposit.depositor, deposit.token, deposit.amount, block.timestamp);
    }

    function liquidateCollateral(uint256 loanId, address recipient) external onlyFactory nonReentrant {
        CollateralDeposit storage deposit = deposits[loanId];
        require(!deposit.released, "Already released");
        require(deposit.amount > 0, "No collateral");
        require(recipient != address(0), "Invalid recipient");

        address defaultedBorrower = deposit.depositor;
        deposit.released = true;

        if (deposit.token == address(0)) {
            (bool success, ) = payable(recipient).call{value: deposit.amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(deposit.token).safeTransfer(recipient, deposit.amount);
        }

        emit CollateralLiquidated(loanId, recipient, defaultedBorrower, deposit.token, deposit.amount, block.timestamp);
    }

    function getDeposit(uint256 loanId) external view returns (CollateralDeposit memory) {
        return deposits[loanId];
    }

    receive() external payable {}
}