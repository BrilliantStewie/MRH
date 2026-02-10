import { createContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const StaffContext = createContext();

const StaffContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [sToken, setSToken] = useState(
    localStorage.getItem("sToken") || ""
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
        toast.success("Staff login successful");
        return true;
      }

      toast.error(data.message);
      return false;
    } catch {
      toast.error("Staff login failed");
      return false;
    }
  };

  return (
    <StaffContext.Provider value={{ backendUrl, sToken, staffLogin }}>
      {children}
    </StaffContext.Provider>
  );
};

export default StaffContextProvider;
