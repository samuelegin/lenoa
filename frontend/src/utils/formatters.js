import { formatUnits, parseUnits } from 'ethers';
import { format, formatDistanceToNow } from 'date-fns';
import { TOKEN_INFO, FEES } from './constants';

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount, tokenAddress, includeSymbol = true) {
  if (!amount || !tokenAddress) return '0';
  
  const tokenInfo = TOKEN_INFO[tokenAddress];
  if (!tokenInfo) return amount.toString();
  
  try {
    const formatted = formatUnits(amount, tokenInfo.decimals);
    const value = parseFloat(formatted).toFixed(tokenInfo.decimals === 6 ? 2 : 4);
    
    return includeSymbol ? `${value} ${tokenInfo.symbol}` : value;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
}

/**
 * Parse token amount to BigInt with proper decimals
 */
export function parseTokenAmount(amount, tokenAddress) {
  if (!amount || !tokenAddress) return 0n;
  
  const tokenInfo = TOKEN_INFO[tokenAddress];
  if (!tokenInfo) return 0n;
  
  try {
    return parseUnits(amount.toString(), tokenInfo.decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return 0n;
  }
}

/**
 * Format address to short version (0x1234...5678)
 */
export function formatAddress(address, length = 4) {
  if (!address) return '';
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp) * 1000);
  return format(date, 'MMM d, yyyy HH:mm');
}

/**
 * Format relative time 
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp) * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Calculate repayment amount with interest
 */
export function calculateRepaymentAmount(loanAmount, interestRate) {
  if (!loanAmount || !interestRate) return 0n;
  
  try {
    const interest = (BigInt(loanAmount) * BigInt(interestRate)) / 100n;
    return BigInt(loanAmount) + interest;
  } catch (error) {
    console.error('Error calculating repayment:', error);
    return 0n;
  }
}

/**
 * Calculate amount after origination fee
 */
export function calculateAmountAfterOriginationFee(loanAmount) {
  if (!loanAmount) return 0n;
  
  try {
    const fee = (BigInt(loanAmount) * 50n) / 10000n;
    return BigInt(loanAmount) - fee;
  } catch (error) {
    return 0n;
  }
}

/**
 * Calculate lender receives after interest fee
 */
export function calculateLenderReceives(repaymentAmount, loanAmount) {
  if (!repaymentAmount || !loanAmount) return 0n;
  
  try {
    const interest = BigInt(repaymentAmount) - BigInt(loanAmount);
    const interestFee = (interest * 500n) / 10000n; // 5%
    return BigInt(repaymentAmount) - interestFee;
  } catch (error) {
    return 0n;
  }
}

/**
 * Calculate protocol fees
 */
export function calculateFees(loanAmount, repaymentAmount) {
  const originationFee = (BigInt(loanAmount) * 50n) / 10000n;
  const interest = BigInt(repaymentAmount) - BigInt(loanAmount);
  const interestFee = (interest * 500n) / 10000n;
  
  return {
    originationFee,
    interestFee,
    totalFee: originationFee + interestFee,
  };
}

/**
 * Format percentage
 */
export function formatPercent(value) {
  return `${value}%`;
}

/**
 * Format duration in days
 */
export function formatDuration(seconds) {
  if (!seconds) return '';
  const days = Math.floor(Number(seconds) / 86400);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * Calculate time remaining
 */
export function calculateTimeRemaining(deadline) {
  if (!deadline) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(deadline) - now;
  
  return remaining > 0 ? remaining : 0;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(deadline) {
  const remaining = calculateTimeRemaining(deadline);
  
  if (remaining === 0) return 'Expired';
  
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Calculate loan-to-value ratio (LTV)
 */
export function calculateLTV(loanAmount, collateralAmount, loanToken, collateralToken) {
  if (!loanAmount || !collateralAmount) return 0;
  
  try {
    const ltv = (Number(loanAmount) / Number(collateralAmount)) * 100;
    return Math.round(ltv);
  } catch (error) {
    return 0;
  }
}

/**
 * Get token symbol from address
 */
export function getTokenSymbol(tokenAddress) {
  const tokenInfo = TOKEN_INFO[tokenAddress];
  return tokenInfo ? tokenInfo.symbol : 'Unknown';
}

/**
 * Get token icon from address
 */
export function getTokenIcon(tokenAddress) {
  const tokenInfo = TOKEN_INFO[tokenAddress];
  return tokenInfo ? tokenInfo.icon : '○';
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

/**
 * Format transaction hash for explorer link
 */
export function getExplorerTxUrl(txHash, network = 'sepolia') {
  return `https://${network}.etherscan.io/tx/${txHash}`;
}

/**
 * Format address for explorer link
 */
export function getExplorerAddressUrl(address, network = 'sepolia') {
  return `https://${network}.etherscan.io/address/${address}`;
}