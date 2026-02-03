import React from "react";
import { Route, Routes } from "react-router-dom";
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
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Note: BookingDetails is imported inside MyBookings.jsx now, not here.

const App = () => {
  return (
    <div className="w-full overflow-hidden">
      <ToastContainer />
      <Navbar />

      <main className="min-h-screen pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          
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
                {/* REMOVED BookingDetails Route - It is now a Modal in MyBookings */}
                <Route path="/upload-payment" element={<UploadPayment />} />
              </Routes>
            </div>
          } />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;