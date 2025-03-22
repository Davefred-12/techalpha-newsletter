/* eslint-disable react/prop-types */
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";

const PrivateRoute = ({ children }) => {
  const { isAdminLoggedIn } = useContext(AuthContext);

  if (!isAdminLoggedIn) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;