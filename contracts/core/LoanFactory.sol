// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ILoanNFT.sol";
import "../interfaces/ICollateralVault.sol";

contract LoanFactory is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    //Sepolia Token Addresses
    address public constant SEPOLIA_DAI = 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357;
    address public constant SEPOLIA_USDC = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    address public constant SEPOLIA_LINK = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address public constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address public constant NATIVE_ETH = address(0);

    // Fee Configuration: 0.5% from borrower, 5% from interest
    uint256 public originationFeePercent = 50;   // 0.5% (in basis points)
    uint256 public interestFeePercent = 500;     // 5% (in basis points)
    address public feeCollector;
    
    uint256 public totalFeesCollected;
    mapping(address => uint256) public feesByToken;

    ILoanNFT public loanNFT;
    ICollateralVault public collateralVault;

    uint256 public nextLoanId = 1;
    uint256 public constant MAX_INTEREST_RATE = 50;
    uint256 public constant MAX_DURATION = 90 days;

    enum LoanStatus { PENDING, ACTIVE, REPAID, DEFAULTED, CANCELLED }

    struct TokenConfig {
        bool enabled;
        uint256 minLoanAmount;
        uint256 maxLoanAmount;
        string symbol;
        uint8 decimals;
    }

    struct LoanRequest {
        address borrower;
        address lender;
        address loanToken;
        uint256 loanAmount;
        uint256 repaymentAmount;
        address collateralToken;
        uint256 collateralAmount;
        uint256 duration;
        uint256 deadline;
        uint256 createdAt;
        LoanStatus status;
    }

    mapping(uint256 => LoanRequest) public loans;
    mapping(address => TokenConfig) public supportedTokens;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;

    event LoanRequestCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address loanToken,
        uint256 loanAmount,
        uint256 repaymentAmount,
        address collateralToken,
        uint256 collateralAmount,
        uint256 duration
    );

    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 timestamp);
    event LoanRepaid(uint256 indexed loanId, uint256 timestamp);
    event LoanDefaulted(uint256 indexed loanId, uint256 timestamp);
    event LoanCancelled(uint256 indexed loanId);

    event FeeCollected(
        address indexed token, 
        uint256 amount, 
        string feeType
    );

    event FeeWithdrawn(
        address indexed token, 
        uint256 amount, 
        address indexed recipient
    );

    event FeeConfigUpdated(
        uint256 originationFee, 
        uint256 interestFee
    );

    event FeeCollectorUpdated(
        address indexed oldCollector, 
        address indexed newCollector
    );

    event TokenAdded(
        address indexed token,
        string symbol,
        uint256 minAmount,
        uint256 maxAmount
    );

    event TokenRemoved(
        address indexed token,
        string symbol
    );

    constructor(address _loanNFT, address _collateralVault) Ownable(msg.sender) {
        loanNFT = ILoanNFT(_loanNFT);
        collateralVault = ICollateralVault(_collateralVault);
        feeCollector = msg.sender;
        _initializeTokens();
    }

    function _initializeTokens() internal {
        supportedTokens[SEPOLIA_DAI] = TokenConfig({
            enabled: true,
            minLoanAmount: 100 * 10**18,
            maxLoanAmount: 10000 * 10**18,
            symbol: "DAI",
            decimals: 18
        });

        supportedTokens[SEPOLIA_USDC] = TokenConfig({
            enabled: true,
            minLoanAmount: 100 * 10**6,
            maxLoanAmount: 10000 * 10**6,
            symbol: "USDC",
            decimals: 6
        });

        supportedTokens[SEPOLIA_LINK] = TokenConfig({
            enabled: true,
            minLoanAmount: 10 * 10**18,
            maxLoanAmount: 1000 * 10**18,
            symbol: "LINK",
            decimals: 18
        });

        supportedTokens[NATIVE_ETH] = TokenConfig({
            enabled: true,
            minLoanAmount: 0.01 ether,
            maxLoanAmount: 10 ether,
            symbol: "ETH",
            decimals: 18
        });

        supportedTokens[SEPOLIA_WETH] = TokenConfig({
            enabled: true,
            minLoanAmount: 0.01 * 10**18,
            maxLoanAmount: 10 * 10**18,
            symbol: "WETH",
            decimals: 18
        });
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid collector address");
        address oldCollector = feeCollector;
        feeCollector = _newCollector;
        emit FeeCollectorUpdated(oldCollector, _newCollector);
    }

    function setFeePercents(uint256 _originationFee, uint256 _interestFee) external onlyOwner {
        require(_originationFee <= 500, "Origination fee too high");
        require(_interestFee <= 2000, "Interest fee too high");
        
        originationFeePercent = _originationFee;
        interestFeePercent = _interestFee;
        
        emit FeeConfigUpdated(_originationFee, _interestFee);
    }

    function withdrawFees(address token) external onlyOwner nonReentrant {
        uint256 feeAmount = feesByToken[token];
        require(feeAmount > 0, "No fees to withdraw");
        
        feesByToken[token] = 0;
        
        if (token == NATIVE_ETH) {
            (bool success, ) = payable(feeCollector).call{value: feeAmount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(feeCollector, feeAmount);
        }
        
        emit FeeWithdrawn(token, feeAmount, feeCollector);
    }

    function withdrawAllFees() external onlyOwner nonReentrant {
        if (feesByToken[NATIVE_ETH] > 0) {
            uint256 ethFees = feesByToken[NATIVE_ETH];
            feesByToken[NATIVE_ETH] = 0;
            (bool success, ) = payable(feeCollector).call{value: ethFees}("");
            require(success, "ETH transfer failed");
            emit FeeWithdrawn(NATIVE_ETH, ethFees, feeCollector);
        }
        
        address[4] memory tokens = [SEPOLIA_DAI, SEPOLIA_USDC, SEPOLIA_LINK, SEPOLIA_WETH];
        for (uint i = 0; i < tokens.length; i++) {
            if (feesByToken[tokens[i]] > 0) {
                uint256 tokenFees = feesByToken[tokens[i]];
                feesByToken[tokens[i]] = 0;
                IERC20(tokens[i]).safeTransfer(feeCollector, tokenFees);
                emit FeeWithdrawn(tokens[i], tokenFees, feeCollector);
            }
        }
    }

    function createLoanRequest(
        address _loanToken,
        uint256 _loanAmount,
        uint256 _interestRate,
        uint256 _durationDays,
        address _collateralToken,
        uint256 _collateralAmount
    ) external payable nonReentrant returns (uint256) {
        require(supportedTokens[_loanToken].enabled, "Loan token not supported");
        require(supportedTokens[_collateralToken].enabled, "Collateral not supported");
        require(_loanAmount >= supportedTokens[_loanToken].minLoanAmount, "Amount too low");
        require(_loanAmount <= supportedTokens[_loanToken].maxLoanAmount, "Amount too high");
        require(_interestRate > 0 && _interestRate <= MAX_INTEREST_RATE, "Invalid interest rate");
        require(_durationDays > 0 && _durationDays * 1 days <= MAX_DURATION, "Invalid duration");
        require(_collateralAmount > 0, "Collateral required");

        uint256 currentLoanId = nextLoanId;
        
        if (_collateralToken == NATIVE_ETH) {
            require(msg.value == _collateralAmount, "Incorrect ETH amount");
            collateralVault.depositCollateral{value: msg.value}(
                currentLoanId,
                NATIVE_ETH,
                _collateralAmount,
                msg.sender
            );
        } else {
            require(msg.value == 0, "Don't send ETH for ERC-20 collateral");
            IERC20(_collateralToken).safeTransferFrom(msg.sender, address(collateralVault), _collateralAmount);
            collateralVault.depositCollateral(currentLoanId, _collateralToken, _collateralAmount, msg.sender);
        }

        loans[currentLoanId] = LoanRequest({
            borrower: msg.sender,
            lender: address(0),
            loanToken: _loanToken,
            loanAmount: _loanAmount,
            repaymentAmount: _loanAmount + (_loanAmount * _interestRate / 100),
            collateralToken: _collateralToken,
            collateralAmount: _collateralAmount,
            duration: _durationDays * 1 days,
            deadline: 0,
            createdAt: block.timestamp,
            status: LoanStatus.PENDING
        });

        borrowerLoans[msg.sender].push(currentLoanId);

        emit LoanRequestCreated(
            currentLoanId,
            msg.sender,
            _loanToken,
            _loanAmount,
            loans[currentLoanId].repaymentAmount,
            _collateralToken,
            _collateralAmount,
            loans[currentLoanId].duration
        );

        nextLoanId++;
        return currentLoanId;
    }

    function fundLoan(uint256 loanId) external payable nonReentrant {
        LoanRequest storage loan = loans[loanId];
        require(loan.status == LoanStatus.PENDING, "Loan not available");
        require(loan.borrower != msg.sender, "Cannot fund own loan");

        uint256 originationFee = (loan.loanAmount * originationFeePercent) / 10000;
        uint256 amountToBorrower = loan.loanAmount - originationFee;

        loan.lender = msg.sender;
        loan.deadline = block.timestamp + loan.duration;
        loan.status = LoanStatus.ACTIVE;

        lenderLoans[msg.sender].push(loanId);

        if (loan.loanToken == NATIVE_ETH) {
            require(msg.value == loan.loanAmount, "Incorrect ETH amount");
            
            feesByToken[NATIVE_ETH] += originationFee;
            totalFeesCollected += originationFee;
            emit FeeCollected(NATIVE_ETH, originationFee, "origination");
            
            (bool success, ) = payable(loan.borrower).call{value: amountToBorrower}("");
            require(success, "ETH transfer failed");
        } else {
            require(msg.value == 0, "Don't send ETH for ERC-20 loan");
            
            IERC20(loan.loanToken).safeTransferFrom(msg.sender, address(this), loan.loanAmount);
            
            feesByToken[loan.loanToken] += originationFee;
            totalFeesCollected += originationFee;
            emit FeeCollected(loan.loanToken, originationFee, "origination");
            
            IERC20(loan.loanToken).safeTransfer(loan.borrower, amountToBorrower);
        }

        loanNFT.mint(msg.sender, loanId);

        emit LoanFunded(loanId, msg.sender, block.timestamp);
    }

    function repayLoan(uint256 loanId) external payable nonReentrant {
        LoanRequest storage loan = loans[loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(msg.sender == loan.borrower, "Only borrower can repay");
        require(block.timestamp <= loan.deadline, "Loan defaulted");

        address currentHolder = loanNFT.ownerOf(loanId);

        uint256 interest = loan.repaymentAmount - loan.loanAmount;
        uint256 interestFee = (interest * interestFeePercent) / 10000;
        uint256 amountToLender = loan.repaymentAmount - interestFee;

        if (loan.loanToken == NATIVE_ETH) {
            require(msg.value == loan.repaymentAmount, "Incorrect repayment amount");
            
            feesByToken[NATIVE_ETH] += interestFee;
            totalFeesCollected += interestFee;
            emit FeeCollected(NATIVE_ETH, interestFee, "interest");
            
            (bool success, ) = payable(currentHolder).call{value: amountToLender}("");
            require(success, "ETH transfer failed");
        } else {
            require(msg.value == 0, "Don't send ETH for ERC-20 repayment");
            
            IERC20(loan.loanToken).safeTransferFrom(msg.sender, address(this), loan.repaymentAmount);
            
            feesByToken[loan.loanToken] += interestFee;
            totalFeesCollected += interestFee;
            emit FeeCollected(loan.loanToken, interestFee, "interest");
            
            IERC20(loan.loanToken).safeTransfer(currentHolder, amountToLender);
        }

        collateralVault.releaseCollateral(loanId);

        loan.status = LoanStatus.REPAID;

        loanNFT.burn(loanId);

        emit LoanRepaid(loanId, block.timestamp);
    }

    function liquidateLoan(uint256 loanId) external nonReentrant {
        LoanRequest storage loan = loans[loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(block.timestamp > loan.deadline, "Loan not defaulted yet");

        address nftHolder = loanNFT.ownerOf(loanId);

        collateralVault.liquidateCollateral(loanId, nftHolder);

        loan.status = LoanStatus.DEFAULTED;

        emit LoanDefaulted(loanId, block.timestamp);
    }

    function cancelLoan(uint256 loanId) external nonReentrant {
        LoanRequest storage loan = loans[loanId];
        require(loan.status == LoanStatus.PENDING, "Loan not pending");
        require(msg.sender == loan.borrower, "Only borrower can cancel");

        loan.status = LoanStatus.CANCELLED;

        collateralVault.releaseCollateral(loanId);

        emit LoanCancelled(loanId);
    }

    function getLoan(uint256 loanId) external view returns (LoanRequest memory) {
        return loans[loanId];
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getLenderLoans(address lender) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token].enabled;
    }

    function addSupportedToken(
        address token,
        uint256 minAmount,
        uint256 maxAmount,
        string memory symbol,
        uint8 decimals
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(maxAmount > minAmount, "Invalid amounts");
        
        supportedTokens[token] = TokenConfig({
            enabled: true,
            minLoanAmount: minAmount,
            maxLoanAmount: maxAmount,
            symbol: symbol,
            decimals: decimals
        });

        emit TokenAdded(token, symbol, minAmount, maxAmount);
    }

    function removeSupportedToken(address token) external onlyOwner {
        string memory symbol = supportedTokens[token].symbol;
        supportedTokens[token].enabled = false;
        emit TokenRemoved(token, symbol);
    }

    function getCollectedFees(address token) external view returns (uint256) {
        return feesByToken[token];
    }

    function getAllCollectedFees() external view returns (
        uint256 ethFees,
        uint256 daiFees,
        uint256 usdcFees,
        uint256 linkFees,
        uint256 wethFees
    ) {
        return (
            feesByToken[NATIVE_ETH],
            feesByToken[SEPOLIA_DAI],
            feesByToken[SEPOLIA_USDC],
            feesByToken[SEPOLIA_LINK],
            feesByToken[SEPOLIA_WETH]
        );
    }

    receive() external payable {}
}