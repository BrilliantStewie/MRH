import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import "./index.css";

// Context Providers
import AppContextProvider from "./context/AppContext.jsx";
import AdminContextProvider from "./context/AdminContext.jsx";
import StaffContextProvider from "./context/StaffContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 
        Context hierarchy:
        1. AppContextProvider   → global/shared state
        2. AdminContextProvider → admin authentication & admin data
        3. StaffContextProvider → staff authentication & staff data
      */}
      <AppContextProvider>
        <AdminContextProvider>
          <StaffContextProvider>
            <App />
          </StaffContextProvider>
        </AdminContextProvider>
      </AppContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
