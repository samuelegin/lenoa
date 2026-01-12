import { useState, useEffect, useCallback } from 'react';
import { useContract } from './useContract';
import { useAccount } from 'wagmi';

export function useLoans() {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { readContract } = useContract('LoanFactory');
  const { address } = useAccount();

  const fetchLoans = useCallback(async () => {
    if (!readContract) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const nextLoanId = await readContract.read.nextLoanId();
      const totalLoans = Number(nextLoanId) - 1;

      if (totalLoans === 0) {
        setLoans([]);
        setIsLoading(false);
        return;
      }

      const loanPromises = [];
      for (let i = 1; i <= totalLoans; i++) {
        loanPromises.push(readContract.read.getLoan([BigInt(i)]));
      }

      const loanData = await Promise.all(loanPromises);

      const transformedLoans = loanData.map((loan, index) => ({
        id: index + 1,
        borrower: loan.borrower,
        lender: loan.lender,
        loanToken: loan.loanToken,
        loanAmount: loan.loanAmount,
        repaymentAmount: loan.repaymentAmount,
        collateralToken: loan.collateralToken,
        collateralAmount: loan.collateralAmount,
        duration: loan.duration,
        deadline: loan.deadline,
        createdAt: loan.createdAt,
        status: Number(loan.status),
      }));

      setLoans(transformedLoans);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [readContract]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return {
    loans,
    isLoading,
    error,
    refetch: fetchLoans,
  };
}

export function useUserLoans() {
  const [borrowedLoans, setBorrowedLoans] = useState([]);
  const [lendedLoans, setLendedLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { readContract } = useContract('LoanFactory');
  const { address } = useAccount();

  const fetchUserLoans = useCallback(async () => {
    if (!readContract || !address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get borrowed loans
      const borrowedIds = await readContract.read.getBorrowerLoans([address]);
      const borrowedPromises = borrowedIds.map(id => 
        readContract.read.getLoan([id])
      );
      const borrowedData = await Promise.all(borrowedPromises);

      const lendedIds = await readContract.read.getLenderLoans([address]);
      const lendedPromises = lendedIds.map(id => 
        readContract.read.getLoan([id])
      );
      const lendedData = await Promise.all(lendedPromises);

      const transformLoan = (loan, id) => ({
        id: Number(id),
        borrower: loan.borrower,
        lender: loan.lender,
        loanToken: loan.loanToken,
        loanAmount: loan.loanAmount,
        repaymentAmount: loan.repaymentAmount,
        collateralToken: loan.collateralToken,
        collateralAmount: loan.collateralAmount,
        duration: loan.duration,
        deadline: loan.deadline,
        createdAt: loan.createdAt,
        status: Number(loan.status),
      });

      setBorrowedLoans(borrowedData.map((loan, idx) => 
        transformLoan(loan, borrowedIds[idx])
      ));
      
      setLendedLoans(lendedData.map((loan, idx) => 
        transformLoan(loan, lendedIds[idx])
      ));
    } catch (err) {
      console.error('Error fetching user loans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [readContract, address]);

  useEffect(() => {
    fetchUserLoans();
  }, [fetchUserLoans]);

  return {
    borrowedLoans,
    lendedLoans,
    isLoading,
    refetch: fetchUserLoans,
  };
}