import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const StaffContext = createContext();

const StaffContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [sToken, setSToken] = useState(
    localStorage.getItem("sToken") || null
  );

  // =====================================================
  // 🛡️ AUTOMATIC LOGOUT INTERCEPTOR
  // =====================================================
  // This watches for 401 errors (Unauthorized) which are sent 
  // by the middleware when a password version mismatch is detected.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("sToken");
          setSToken(null);
          toast.error(error.response.data.message || "Session expired. Please login again.");
        }
        return Promise.reject(error);
      }
    );

    // Eject interceptor on unmount to prevent memory leaks
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  /* =====================================================
     STAFF LOGIN
  ===================================================== */
  const staffLogin = async (identifier, password) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/staff/login`,
        { identifier, password }
      );

      if (data.success) {
        localStorage.setItem("sToken", data.token);
        setSToken(data.token);
        toast.success("Staff Login Successful");
        return data;
      } else {
        toast.error(data.message);
        return data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      
      if (errorMessage.toLowerCase().includes("disabled") || errorMessage.toLowerCase().includes("frozen")) {
         return { success: false, message: errorMessage };
      }

      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  /* =====================================================
     STAFF LOGOUT
  ===================================================== */
  const staffLogout = () => {
    localStorage.removeItem("sToken");
    setSToken(null);
    toast.info("Logged out");
  };

  return (
    <StaffContext.Provider
      value={{
        sToken,
        setSToken,
        staffLogin,
        staffLogout,
        backendUrl
      }}
    >
      {children}
    </StaffContext.Provider>
  );
};

export default StaffContextProvider;