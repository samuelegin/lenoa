import { useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { CONTRACTS } from '../utils/constants';

export function useTokenApproval() {
  const [isApproving, setIsApproving] = useState(false);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const checkAndApprove = async (tokenAddress, amount, userAddress) => {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return true;
    }

    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: [{
          name: 'allowance',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          outputs: [{ type: 'uint256' }]
        }],
        functionName: 'allowance',
        args: [userAddress, CONTRACTS.LOAN_FACTORY]
      });

      if (allowance >= amount) {
        return true;
      }
      setIsApproving(true);
      
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }]
        }],
        functionName: 'approve',
        args: [CONTRACTS.LOAN_FACTORY, amount]
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setIsApproving(false);
      return true;
    } catch (error) {
      setIsApproving(false);
      throw error;
    }
  };

  return { checkAndApprove, isApproving };
}