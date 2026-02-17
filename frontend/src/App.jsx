import React from "react";
import { Route, Routes, useLocation } from "react-router-dom"; // 1. Import useLocation
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MyProfile from "./pages/MyProfile";
import MyBookings from "./pages/MyBookings";
import RoomBooking from "./pages/RoomBooking";
import UploadPayment from "./pages/UploadPayment";
import RetreatBooking from "./pages/RetreatBooking";
import Payment from "./pages/Payment";
import ReviewPage from "./pages/ReviewPage"; 
import AllReviews from "./pages/AllReviews"; // 2. Import the new AllReviews page
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const location = useLocation(); // 3. Get the current URL path

  // 4. Logic to hide Navbar/Footer on specific pages
  const isFullScreenPage = location.pathname === '/reviews';

  return (
    <div className="w-full overflow-hidden">
      <ToastContainer />
      
      {/* 5. Only show Navbar if NOT on a full screen page */}
      {!isFullScreenPage && <Navbar />}

      {/* 6. Adjust main container: remove padding-top if on full screen page */}
      <main className={isFullScreenPage ? "" : "min-h-screen pt-20"}>
        <Routes>
          {/* --- PUBLIC / FULL WIDTH ROUTES --- */}
          <Route path="/" element={<Home />} />
          
          {/* ✅ The All Reviews Page (No container, No Navbar) */}
          <Route path="/reviews" element={<AllReviews />} />

          {/* --- MAIN LAYOUT ROUTES (Wrapped in container) --- */}
          <Route path="/*" element={
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <Routes>
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/login" element={<Login />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/retreat-booking" element={<RetreatBooking />} />
                <Route path="/my-profile" element={<MyProfile />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/rooms/:roomId" element={<RoomBooking />} />
                <Route path="/payment/:id" element={<Payment />} />
                
                {/* Single Booking Review Popup */}
                <Route path="/review/:bookingId" element={<ReviewPage />} />
                
                <Route path="/upload-payment" element={<UploadPayment />} />
              </Routes>
            </div>
          } />
        </Routes>
      </main>

      {/* 7. Only show Footer if NOT on a full screen page */}
      {!isFullScreenPage && <Footer />}
    </div>
  );
};

export default App;