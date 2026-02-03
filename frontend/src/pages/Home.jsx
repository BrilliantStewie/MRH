import React from 'react';
import Header from '../components/Header';
import RoomTypeMenu from '../components/RoomTypeMenu';
import Features from '../components/Features'; 
import Testimonials from '../components/Testimonials';
import Banner from '../components/Banner';

const Home = () => {
  return (
    // Ensured background is white to match the new component styles
    <div className="bg-white min-h-screen">
      <Header />
      <Features /> 
      <RoomTypeMenu />
      <Testimonials />
      <Banner />
    </div>
  );
};

export default Home;