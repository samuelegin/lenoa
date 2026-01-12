import { useState } from 'react';
import { useAccount } from 'wagmi';
import Layout from './components/layout/Layout';
import LoanList from './components/loans/LoanList';
import CreateLoanForm from './components/loans/CreateLoanForm';
import './styles/components.css';
import './styles/layout.css';
import './styles/loans.css';

function App() {
  const [activeTab, setActiveTab] = useState('browse');
  const { isConnected } = useAccount();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>P2P Lending with Tradeable Loan NFTs</h1>
          <p>
            Lend money, your loan position gets tokenized in form of NFTs, Trade it anytime. Instant liquidity for lenders.
          </p>
          <div className="hero-actions">
            {!isConnected ? (
              <p className="text-sm">Connect your wallet to get started</p>
            ) : (
              <>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('create')}
                >
                  Create Loan Request
                </button>
                <button 
                  className="btn"
                  onClick={() => setActiveTab('browse')}
                >
                  Browse Loans
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      {isConnected && (
        <section className="section">
          <div className="container">
            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveTab('browse')}
              >
                Browse Loans
              </button>
              <button
                className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Create Loan
              </button>
              <button
                className={`tab ${activeTab === 'my-loans' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-loans')}
              >
                My Loans
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'browse' && (
              <div>
                <div className="section-header">
                  <h2 className="section-title">Available Loans</h2>
                  <p className="section-subtitle">
                    Fund a loan and receive an NFT representing your position
                  </p>
                </div>
                <LoanList filter="pending" />
              </div>
            )}

            {activeTab === 'create' && (
              <div>
                <div className="section-header">
                  <h2 className="section-title">Create Loan Request</h2>
                  <p className="section-subtitle">
                    Deposit collateral and request a loan
                  </p>
                </div>
                <CreateLoanForm onSuccess={() => setActiveTab('my-loans')} />
              </div>
            )}

            {activeTab === 'my-loans' && (
              <div>
                <div className="section-header">
                  <h2 className="section-title">My Loans</h2>
                  <p className="section-subtitle">
                    Loans you've borrowed or funded
                  </p>
                </div>
                <LoanList filter="my-loans" />
              </div>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
}

export default App;