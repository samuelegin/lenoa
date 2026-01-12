import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="container">
        <div className="header-container">
          {/* Logo */}
          <div className="header-logo">
            <a href="/">LENOA</a>
          </div>

          {/* Desktop Navigation */}
          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="#browse" className="header-nav-link">
              Browse
            </a>
            <a href="#create" className="header-nav-link">
              Create
            </a>
            <a href="#my-loans" className="header-nav-link">
              My Loans
            </a>
            <a href="#docs" className="header-nav-link">
              Docs
            </a>
          </nav>

          {/* Actions */}
          <div className="header-actions">
            <ConnectButton 
              showBalance={false}
              chainStatus="icon"
            />
            
            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;