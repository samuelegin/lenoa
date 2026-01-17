import { useState } from 'react';
import { useContract } from './useContract';
import { usePublicClient } from 'wagmi';
import { TOKENS, TX_CONFIRMATIONS } from '../utils/constants';
import { ERC20_ABI } from '../utils/abis';

export function useLoanActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  
  const { writeContract, walletClient, contractAddress } = useContract('LoanFactory');
  const publicClient = usePublicClient();

  const approveToken = async (tokenAddress, spender, amount) => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    try {
      const [account] = await walletClient.getAddresses();
      
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
        account,
      });

      await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });

      return hash;
    } catch (error) {
      console.error('Approval error:', error);
      throw error;
    }
  };

  const createLoan = async (
    loanToken,
    loanAmount,
    interestRate,
    durationDays,
    collateralToken,
    collateralAmount
  ) => {
    if (!writeContract) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setTxHash(null);

      const value = collateralToken === TOKENS.ETH ? collateralAmount : 0n;

      const hash = await writeContract.write.createLoanRequest(
        [
          loanToken,
          loanAmount,
          BigInt(interestRate),
          BigInt(durationDays),
          collateralToken,
          collateralAmount,
        ],
        { value }
      );

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });

      return receipt;
    } catch (error) {
      console.error('Create loan error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fundLoan = async (loanId, loanToken, loanAmount) => {
    if (!writeContract) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setTxHash(null);

      if (loanToken !== TOKENS.ETH) {
        console.log('Approving token spend...');
        await approveToken(loanToken, contractAddress, loanAmount);
        console.log('Token approved');
      }

      const value = loanToken === TOKENS.ETH ? loanAmount : 0n;

      const hash = await writeContract.write.fundLoan(
        [BigInt(loanId)],
        { value }
      );

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });

      return receipt;
    } catch (error) {
      console.error('Fund loan error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const repayLoan = async (loanId, loanToken, repaymentAmount) => {
    if (!writeContract) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setTxHash(null);
      
      if (loanToken !== TOKENS.ETH) {
        console.log('Approving repayment token...');
        await approveToken(loanToken, contractAddress, repaymentAmount);
      }

      const value = loanToken === TOKENS.ETH ? repaymentAmount : 0n;

      const hash = await writeContract.write.repayLoan(
        [BigInt(loanId)],
        { value }
      );

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });

      return receipt;
    } catch (error) {
      console.error('Repay loan error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const liquidateLoan = async (loanId) => {
    if (!writeContract) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setTxHash(null);

      const hash = await writeContract.write.liquidateLoan([BigInt(loanId)]);

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });

      return receipt;
    } catch (error) {
      console.error('Liquidate loan error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelLoan = async (loanId) => {
    if (!writeContract) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setTxHash(null);

      const hash = await writeContract.write.cancelLoan([BigInt(loanId)]);

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });

      return receipt;
    } catch (error) {
      console.error('Cancel loan error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createLoan,
    fundLoan,
    repayLoan,
    liquidateLoan,
    cancelLoan,
    isLoading,
    txHash,
  };
}