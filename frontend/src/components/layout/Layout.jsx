import Header from './header';
import Footer from './Footer';

function Layout({ children }) {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;