/* eslint-disable react/prop-types */
import { createContext, useState, useEffect } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      setIsAdminLoggedIn(true);
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("adminToken", token);
    setIsAdminLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setIsAdminLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isAdminLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};