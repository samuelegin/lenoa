function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-container">
          {/* Footer Content */}
          <div className="footer-content">
            {/* About */}
            <div className="footer-section">
              <h4>Lenoa</h4>
              <p className="text-sm">
                P2P lending protocol with tradeable loan NFTs on Ethereum.
              </p>
            </div>

            {/* Product */}
            <div className="footer-section">
              <h4>Product</h4>
              <ul className="footer-links">
                <li><a href="#browse" className="footer-link">Browse Loans</a></li>
                <li><a href="#create" className="footer-link">Create Loan</a></li>
                <li><a href="#how-it-works" className="footer-link">How It Works</a></li>
                <li><a href="#faq" className="footer-link">FAQ</a></li>
              </ul>
            </div>

            {/* Developers */}
            <div className="footer-section">
              <h4>Developers</h4>
              <ul className="footer-links">
                <li><a href="#docs" className="footer-link">Documentation</a></li>
                <li><a href="https://github.com/your-username/lenoa" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                <li><a href="#contracts" className="footer-link">Smart Contracts</a></li>
                <li><a href="#api" className="footer-link">API</a></li>
              </ul>
            </div>

            {/* Community */}
            <div className="footer-section">
              <h4>Community</h4>
              <ul className="footer-links">
                <li><a href="https://twitter.com/your-handle" className="footer-link" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                <li><a href="https://discord.gg/your-server" className="footer-link" target="_blank" rel="noopener noreferrer">Discord</a></li>
                <li><a href="#blog" className="footer-link">Blog</a></li>
                <li><a href="#support" className="footer-link">Support</a></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="footer-bottom">
            <div className="text-sm">
              © {currentYear} Lenoa. Built on Ethereum.
            </div>
            <div className="footer-social">
              <a href="https://twitter.com/your-handle" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
              <a href="https://github.com/your-username/lenoa" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;