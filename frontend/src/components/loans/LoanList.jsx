import { useState } from 'react';
import { useLoans } from '../../hooks/useLoans';
import { useAccount } from 'wagmi';
import LoanCard from './LoanCard';

function LoanList({ filter = 'all' }) {
  const { address } = useAccount();
  const { loans, isLoading, refetch } = useLoans();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLoans = loans?.filter(loan => {
    if (!loan) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesId = loan.id?.toString().includes(search);
      const matchesBorrower = loan.borrower?.toLowerCase().includes(search);
      const matchesLender = loan.lender?.toLowerCase().includes(search);
      
      if (!matchesId && !matchesBorrower && !matchesLender) {
        return false;
      }
    }

    switch (filter) {
      case 'pending':
        return loan.status === 0;
      case 'active':
        return loan.status === 1;
      case 'completed':
        return loan.status === 2 || loan.status === 3;
      case 'my-loans':
        return (
          loan.borrower?.toLowerCase() === address?.toLowerCase() ||
          loan.lender?.toLowerCase() === address?.toLowerCase()
        );
      case 'borrowed':
        return loan.borrower?.toLowerCase() === address?.toLowerCase();
      case 'lended':
        return loan.lender?.toLowerCase() === address?.toLowerCase();
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
      </div>
    );
  }

  if (!loans || loans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏦</div>
        <h3>No loans yet</h3>
        <p>Be the first to create a loan request!</p>
      </div>
    );
  }

  if (filteredLoans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <h3>No loans found</h3>
        <p>Try adjusting your filters or search criteria.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search/Filter Bar */}
      <div className="loan-filters">
        <div className="loan-filter-group">
          <label className="input-label">Search</label>
          <input
            type="text"
            className="input"
            placeholder="Search by ID, borrower, or lender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Loan Grid */}
      <div className="loan-list">
        {filteredLoans.map(loan => (
          <LoanCard
            key={loan.id}
            loan={loan}
            onFund={refetch}
            onRepay={refetch}
            onLiquidate={refetch}
            onCancel={refetch}
          />
        ))}
      </div>

      {/* Results Count */}
      <div className="text-center mt-lg text-sm">
        Showing {filteredLoans.length} of {loans.length} loans
      </div>
    </div>
  );
}

export default LoanList;