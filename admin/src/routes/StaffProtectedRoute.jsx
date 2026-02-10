import { Navigate } from "react-router-dom";

const StaffProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("sToken");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default StaffProtectedRoute;
