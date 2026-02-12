import { createContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const StaffContext = createContext();

const StaffContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [sToken, setSToken] = useState(
    localStorage.getItem("sToken") || null
  );

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
        // ✅ Return the whole object so Login.jsx can see success: true
        return data; 
      } else {
        // This covers cases where the server sends success: false with a message
        toast.error(data.message);
        return data; 
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      
      // ✅ Critical: If the error is specifically about being disabled, 
      // we return it so the Login component can trigger the "Frozen" UI.
      if (errorMessage.toLowerCase().includes("disabled") || errorMessage.toLowerCase().includes("frozen")) {
         return { success: false, message: errorMessage };
      }

      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

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
        backendUrl,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
};

export default StaffContextProvider;