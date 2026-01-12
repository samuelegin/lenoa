import { formatTokenAmount, formatAddress, formatPercent, formatDuration, getTokenSymbol, getTokenIcon, formatTimeRemaining } from '../../utils/formatters';
import { STATUS_LABELS } from '../../utils/constants';
import { useLoanActions } from '../../hooks/useLoanActions';
import { useAccount } from 'wagmi';

function LoanCard({ loan, onFund, onRepay, onLiquidate, onCancel }) {
  const { address } = useAccount();
  const { fundLoan, repayLoan, liquidateLoan, cancelLoan, isLoading } = useLoanActions();

  const handleFund = async () => {
    try {
      const tx = await fundLoan(loan.id, loan.loanToken, loan.loanAmount);
      if (tx && onFund) {
        onFund(loan.id);
      }
    } catch (error) {
      console.error('Fund error:', error);
    }
  };

  const handleRepay = async () => {
    try {
      const tx = await repayLoan(loan.id, loan.loanToken, loan.repaymentAmount);
      if (tx && onRepay) {
        onRepay(loan.id);
      }
    } catch (error) {
      console.error('Repay error:', error);
    }
  };

  const handleLiquidate = async () => {
    try {
      const tx = await liquidateLoan(loan.id);
      if (tx && onLiquidate) {
        onLiquidate(loan.id);
      }
    } catch (error) {
      console.error('Liquidate error:', error);
    }
  };

  const handleCancel = async () => {
    try {
      const tx = await cancelLoan(loan.id);
      if (tx && onCancel) {
        onCancel(loan.id);
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const isExpired = loan.deadline && Number(loan.deadline) < Math.floor(Date.now() / 1000);
  const isBorrower = address?.toLowerCase() === loan.borrower?.toLowerCase();
  const isLender = address?.toLowerCase() === loan.lender?.toLowerCase();

  return (
    <div className="loan-card">
      {/* Header */}
      <div className="loan-card-header">
        <div>
          <div className="loan-card-id">#{loan.id}</div>
          <div className={`status-badge status-${STATUS_LABELS[loan.status]?.toLowerCase()}`}>
            {STATUS_LABELS[loan.status]}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="loan-card-body">
        <div className="loan-card-details">
          {/* Loan Amount */}
          <div className="loan-card-detail">
            <span className="loan-card-detail-label">Loan Amount</span>
            <span className="loan-card-detail-value">
              {getTokenIcon(loan.loanToken)} {formatTokenAmount(loan.loanAmount, loan.loanToken)}
            </span>
          </div>

          {/* Repayment Amount */}
          <div className="loan-card-detail">
            <span className="loan-card-detail-label">Repayment</span>
            <span className="loan-card-detail-value">
              {formatTokenAmount(loan.repaymentAmount, loan.loanToken)}
            </span>
          </div>

          {/* Interest */}
          <div className="loan-card-detail">
            <span className="loan-card-detail-label">Interest</span>
            <span className="loan-card-detail-value">
              {loan.repaymentAmount && loan.loanAmount ? 
                formatPercent(
                  Math.round(
                    (Number(loan.repaymentAmount - loan.loanAmount) / Number(loan.loanAmount)) * 100
                  )
                ) : '0%'
              }
            </span>
          </div>

          {/* Collateral */}
          <div className="loan-card-detail">
            <span className="loan-card-detail-label">Collateral</span>
            <span className="loan-card-detail-value">
              {getTokenIcon(loan.collateralToken)} {formatTokenAmount(loan.collateralAmount, loan.collateralToken)}
            </span>
          </div>

          {/* Duration */}
          <div className="loan-card-detail">
            <span className="loan-card-detail-label">Duration</span>
            <span className="loan-card-detail-value">
              {formatDuration(loan.duration)}
            </span>
          </div>

          {/* Time Remaining (if active) */}
          {loan.status === 1 && loan.deadline && (
            <div className="loan-card-detail">
              <span className="loan-card-detail-label">Time Left</span>
              <span className="loan-card-detail-value">
                {formatTimeRemaining(loan.deadline)}
              </span>
            </div>
          )}

          {/* Borrower */}
          <div className="loan-card-detail">
            <span className="loan-card-detail-label">Borrower</span>
            <span className="loan-card-detail-value">
              {formatAddress(loan.borrower)}
            </span>
          </div>

          {/* Lender (if funded) */}
          {loan.lender && loan.lender !== '0x0000000000000000000000000000000000000000' && (
            <div className="loan-card-detail">
              <span className="loan-card-detail-label">Lender</span>
              <span className="loan-card-detail-value">
                {formatAddress(loan.lender)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Actions */}
      <div className="loan-card-footer">
        {/* Pending - Can fund or cancel */}
        {loan.status === 0 && (
          <>
            {isBorrower ? (
              <button 
                className="btn btn-full" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Cancel'}
              </button>
            ) : (
              <button 
                className="btn btn-primary btn-full" 
                onClick={handleFund}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Fund Loan'}
              </button>
            )}
          </>
        )}

        {/* Active - Can repay or liquidate */}
        {loan.status === 1 && (
          <>
            {isBorrower && !isExpired ? (
              <button 
                className="btn btn-primary btn-full" 
                onClick={handleRepay}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Repay Loan'}
              </button>
            ) : isExpired && (isLender || !isBorrower) ? (
              <button 
                className="btn btn-full" 
                onClick={handleLiquidate}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Liquidate'}
              </button>
            ) : null}
          </>
        )}

        {/* Repaid/Defaulted/Cancelled - No actions */}
        {(loan.status === 2 || loan.status === 3 || loan.status === 4) && (
          <div className="text-center text-sm">
            {STATUS_LABELS[loan.status]}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoanCard;