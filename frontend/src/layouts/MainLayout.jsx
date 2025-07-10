import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext'; // Assuming you'll create an AuthContext

// Placeholder for a Navbar component
const Navbar = () => {
  // const { user, logout } = useAuth(); // Example if using AuthContext
  const navigate = useNavigate();

  // Placeholder: Check if user is logged in (e.g., from localStorage or context)
  const isAuthenticated = !!localStorage.getItem('authToken'); // Replace with context or service
  const user = JSON.parse(localStorage.getItem('authUser')); // Example, store user info

  const handleLogout = () => {
    // Placeholder logout logic
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // logout(); // Call context logout if used
    navigate('/login');
  };

  return (
    <nav className="bg-church-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold hover:text-church-secondary transition-colors">
          CSMC ONA-ARA CHAPEL
        </Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-church-secondary">Home</Link>
          <Link to="/about" className="hover:text-church-secondary">About Us</Link>
          <Link to="/contact" className="hover:text-church-secondary">Contact</Link>

          {isAuthenticated ? (
            <>
              <Link to="/files" className="hover:text-church-secondary">Files</Link>
              <Link to="/upload" className="hover:text-church-secondary">Upload</Link>
              {user && user.is_staff && ( // Example: Show Admin link if user is staff
                <Link to="/admin/dashboard" className="hover:text-church-secondary">Admin</Link>
              )}
              <Link to="/profile" className="hover:text-church-secondary">Profile</Link>
              <button onClick={handleLogout} className="hover:text-church-secondary transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-church-secondary">Login</Link>
              <Link to="/register" className="hover:text-church-secondary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Placeholder for a Footer component
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white p-4 mt-auto">
      <div className="container mx-auto text-center">
        <p>&copy; {new Date().getFullYear()} CSMC ONA-ARA CHAPEL. All rights reserved.</p>
        {/* You can add more links or information here */}
      </div>
    </footer>
  );
};

const MainLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-church-light-bg">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {children} {/* This is where the routed page content will be rendered */}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
