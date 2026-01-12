import { useState } from 'react';
import { TOKENS, TOKEN_INFO, LIMITS } from '../../utils/constants';
import { parseTokenAmount, formatTokenAmount, calculateRepaymentAmount, calculateAmountAfterOriginationFee } from '../../utils/formatters';
import { useLoanActions } from '../../hooks/useLoanActions';

function CreateLoanForm({ onSuccess }) {
  const { createLoan, isLoading } = useLoanActions();

  const [formData, setFormData] = useState({
    loanToken: TOKENS.DAI,
    loanAmount: '',
    interestRate: '10',
    duration: '30',
    collateralToken: TOKENS.ETH,
    collateralAmount: '',
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const selectToken = (field, token) => {
    setFormData(prev => ({ ...prev, [field]: token }));
    setError('');
  };

  const validate = () => {
    if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
      return 'Please enter a valid loan amount';
    }

    const minAmount = LIMITS.MIN_LOAN_AMOUNTS[formData.loanToken];
    const maxAmount = LIMITS.MAX_LOAN_AMOUNTS[formData.loanToken];

    if (parseFloat(formData.loanAmount) < parseFloat(minAmount)) {
      return `Minimum loan amount is ${minAmount} ${TOKEN_INFO[formData.loanToken].symbol}`;
    }

    if (parseFloat(formData.loanAmount) > parseFloat(maxAmount)) {
      return `Maximum loan amount is ${maxAmount} ${TOKEN_INFO[formData.loanToken].symbol}`;
    }

    if (!formData.interestRate || parseFloat(formData.interestRate) <= 0) {
      return 'Please enter a valid interest rate';
    }

    if (parseFloat(formData.interestRate) > 50) {
      return 'Maximum interest rate is 50%';
    }

    if (!formData.duration || parseFloat(formData.duration) <= 0) {
      return 'Please enter a valid duration';
    }

    if (parseFloat(formData.duration) > 90) {
      return 'Maximum duration is 90 days';
    }

    if (!formData.collateralAmount || parseFloat(formData.collateralAmount) <= 0) {
      return 'Please enter a valid collateral amount';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const loanAmountParsed = parseTokenAmount(formData.loanAmount, formData.loanToken);
      const collateralAmountParsed = parseTokenAmount(formData.collateralAmount, formData.collateralToken);

      const tx = await createLoan(
        formData.loanToken,
        loanAmountParsed,
        parseInt(formData.interestRate),
        parseInt(formData.duration),
        formData.collateralToken,
        collateralAmountParsed
      );

      if (tx) {
        setFormData({
          loanToken: TOKENS.DAI,
          loanAmount: '',
          interestRate: '10',
          duration: '30',
          collateralToken: TOKENS.ETH,
          collateralAmount: '',
        });
        onSuccess?.();
      }
    } catch (err) {
      console.error('Create loan error:', err);
      setError(err.message || 'Failed to create loan request');
    }
  };

  const loanAmountParsed = formData.loanAmount ? parseTokenAmount(formData.loanAmount, formData.loanToken) : 0n;
  const repaymentAmount = loanAmountParsed && formData.interestRate ? 
    calculateRepaymentAmount(loanAmountParsed, parseInt(formData.interestRate)) : 0n;
  const amountAfterFee = loanAmountParsed ? calculateAmountAfterOriginationFee(loanAmountParsed) : 0n;

  return (
    <form onSubmit={handleSubmit} className="create-loan-form">
      {/* Loan Details */}
      <div className="form-section">
        <h3 className="form-section-title">Loan Details</h3>

        {/* Loan Token */}
        <div className="input-group">
          <label className="input-label">Loan Token</label>
          <div className="token-selector">
            {Object.entries(TOKENS).map(([key, address]) => (
              <button
                key={address}
                type="button"
                className={`token-option ${formData.loanToken === address ? 'selected' : ''}`}
                onClick={() => selectToken('loanToken', address)}
              >
                <div className="token-option-symbol">{TOKEN_INFO[address].icon} {TOKEN_INFO[address].symbol}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Loan Amount */}
        <div className="input-group">
          <label className="input-label">Loan Amount</label>
          <input
            type="number"
            name="loanAmount"
            className="input"
            placeholder="0.00"
            value={formData.loanAmount}
            onChange={handleChange}
            step="any"
            required
          />
          <span className="input-helper">
            Min: {LIMITS.MIN_LOAN_AMOUNTS[formData.loanToken]} | Max: {LIMITS.MAX_LOAN_AMOUNTS[formData.loanToken]}
          </span>
        </div>

        {/* Interest & Duration */}
        <div className="form-row">
          <div className="input-group">
            <label className="input-label">Interest Rate (%)</label>
            <input
              type="number"
              name="interestRate"
              className="input"
              placeholder="10"
              value={formData.interestRate}
              onChange={handleChange}
              min="1"
              max="50"
              required
            />
            <span className="input-helper">Max: 50%</span>
          </div>

          <div className="input-group">
            <label className="input-label">Duration (Days)</label>
            <input
              type="number"
              name="duration"
              className="input"
              placeholder="30"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              max="90"
              required
            />
            <span className="input-helper">Max: 90 days</span>
          </div>
        </div>
      </div>

      {/* Collateral Details */}
      <div className="form-section">
        <h3 className="form-section-title">Collateral</h3>

        {/* Collateral Token */}
        <div className="input-group">
          <label className="input-label">Collateral Token</label>
          <div className="token-selector">
            {Object.entries(TOKENS).map(([key, address]) => (
              <button
                key={address}
                type="button"
                className={`token-option ${formData.collateralToken === address ? 'selected' : ''}`}
                onClick={() => selectToken('collateralToken', address)}
              >
                <div className="token-option-symbol">{TOKEN_INFO[address].icon} {TOKEN_INFO[address].symbol}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Collateral Amount */}
        <div className="input-group">
          <label className="input-label">Collateral Amount</label>
          <input
            type="number"
            name="collateralAmount"
            className="input"
            placeholder="0.00"
            value={formData.collateralAmount}
            onChange={handleChange}
            step="any"
            required
          />
          <span className="input-helper">
            This will be deposited as collateral
          </span>
        </div>
      </div>

      {/* Preview */}
      {loanAmountParsed > 0n && (
        <div className="form-section">
          <h3 className="form-section-title">Preview</h3>
          
          <div className="loan-card-details">
            <div className="loan-card-detail">
              <span className="loan-card-detail-label">You Request</span>
              <span className="loan-card-detail-value">
                {formatTokenAmount(loanAmountParsed, formData.loanToken)}
              </span>
            </div>

            <div className="loan-card-detail">
              <span className="loan-card-detail-label">You Receive (after 0.5% fee)</span>
              <span className="loan-card-detail-value">
                {formatTokenAmount(amountAfterFee, formData.loanToken)}
              </span>
            </div>

            <div className="loan-card-detail">
              <span className="loan-card-detail-label">You Must Repay</span>
              <span className="loan-card-detail-value">
                {formatTokenAmount(repaymentAmount, formData.loanToken)}
              </span>
            </div>

            <div className="loan-card-detail">
              <span className="loan-card-detail-label">Collateral</span>
              <span className="loan-card-detail-value">
                {formData.collateralAmount ? 
                  formatTokenAmount(parseTokenAmount(formData.collateralAmount, formData.collateralToken), formData.collateralToken) : '0'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={isLoading}
      >
        {isLoading ? 'Creating Your Loan Request...' : 'Create Loan Request'}
      </button>

      <p className="text-center text-sm mt-md">
        Note: You must approve collateral token spending before creating the loan
      </p>
    </form>
  );
}

export default CreateLoanForm;