import { useMemo } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { getContract } from 'viem';
import { CONTRACTS } from '../utils/constants';

import LoanFactoryABI from '../abis/LoanFactory.json';
import LoanNFTABI from '../abis/LoanNFT.json';
import CollateralVaultABI from '../abis/CollateralVault.json';

export function useContract(contractName) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const contract = useMemo(() => {
    let address, abi;

    switch (contractName) {
      case 'LoanFactory':
        address = CONTRACTS.LOAN_FACTORY;
        abi = LoanFactoryABI.abi;
        break;
      case 'LoanNFT':
        address = CONTRACTS.LOAN_NFT;
        abi = LoanNFTABI.abi;
        break;
      case 'CollateralVault':
        address = CONTRACTS.COLLATERAL_VAULT;
        abi = CollateralVaultABI.abi;
        break;
      default:
        return null;
    }

    if (!address || !abi) return null;

    return {
      address,
      abi,
    };
  }, [contractName]);

  const readContract = useMemo(() => {
    if (!contract || !publicClient) return null;

    return getContract({
      address: contract.address,
      abi: contract.abi,
      client: publicClient,
    });
  }, [contract, publicClient]);

  const writeContract = useMemo(() => {
    if (!contract || !walletClient) return null;

    return getContract({
      address: contract.address,
      abi: contract.abi,
      client: walletClient,
    });
  }, [contract, walletClient]);

  return {
    writeContract,
    readContract,
    walletClient,
    contractAddress: contract?.address,
  };
}