/* eslint-disable react/prop-types */
import { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { AuthContext } from "../../AuthContext";

const Navbar = ({ setShowLogin }) => {
  const { isAdminLoggedIn, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Determine which buttons to show based on current route and login state
  const renderNavButtons = () => {
    if (isAdminLoggedIn) {
      return (
        <>
          {location.pathname !== "/admin-dashboard" && (
            <Link to="/admin-dashboard" className="nav-link">
              Admin Dashboard
            </Link>
          )}
          {location.pathname !== "/send-newsletter" && (
            <Link to="/send-newsletter" className="nav-link">
              Send Newsletter
            </Link>
          )}
          <button onClick={handleLogout} className="logout">
            Logout
          </button>
        </>
      );
    }

    // Admin is not logged in
    if (location.pathname === "/thank-you") {
      return (
        <>
          <Link to="/" className="nav-link">
            Home
          </Link>
          <button
            onClick={() => setShowLogin(true)}
            className="admin-login-btn"
          >
            Admin Login
          </button>
        </>
      );
    }

    // Default buttons for other pages
    return (
      <button onClick={() => setShowLogin(true)} className="admin-login-btn">
        Admin Login
      </button>
    );
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-logo">
          <img src="Logos.jpg" alt="TechAlpha Logo" className="logo" />
          <Link to="/" className="navbar-brand">
            Newsletter PRO
          </Link>
        </div>
        <div className="nav-links">{renderNavButtons()}</div>
      </div>
    </nav>
  );
};

export default Navbar;
