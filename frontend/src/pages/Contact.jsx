import React from 'react';
import mrh_contact from '../assets/mrh_contact.jpg'; 
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 pt-10">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Contact <span className="text-blue-600">Us</span>
          </h1>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-500 md:text-base">
            We are here to assist you. Reach out to the Mercedarian Retreat House for any inquiries regarding our facilities and spiritual retreats.
          </p>
        </div>

        {/* --- MAIN CONTENT: Aligned Grid --- */}
        <div className="grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:gap-8">
          
          {/* Left Column: Centered Image */}
          <div className="relative group min-h-[500px]">
            <div className="absolute -inset-4 bg-blue-100 rounded-[2.5rem] -z-10 transform -rotate-1 group-hover:rotate-0 transition-transform duration-500"></div>
            
            <img 
                className="w-full h-full rounded-[2rem] shadow-xl object-cover object-center border border-slate-200" 
                src={mrh_contact} 
                alt="Mercedarian Retreat House Contact" 
            />
          </div>

          {/* Right Column: Aligned Info Card */}
          <div className="bg-white p-8 md:p-12 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-50 pb-4">
                Get in Touch
            </h3>
            
            <div className="space-y-8">
                {/* Location Section */}
                <div className="flex items-start gap-5">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <MapPin size={22} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm uppercase tracking-wide">Address</p>
                        <p className="text-slate-500 leading-relaxed mt-1">
                            Sitio Union, Brgy. Totolan, <br /> 
                            Dauis, Bohol, Philippines
                        </p>
                    </div>
                </div>

                {/* Phone Section */}
                <div className="flex items-start gap-5">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Phone size={22} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm uppercase tracking-wide">Phone</p>
                        <p className="text-slate-500 mt-1">+63 934 8194 573</p>
                    </div>
                </div>

                {/* Email Section */}
                <div className="flex items-start gap-5">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Mail size={22} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm uppercase tracking-wide">Email</p>
                        <p className="text-slate-500 mt-1">mercedarianretreat@gmail.com</p>
                    </div>
                </div>

                {/* Office Hours Section */}
                <div className="flex items-start gap-5">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm uppercase tracking-wide">Office Hours</p>
                        <div className="text-slate-500 mt-1 text-sm space-y-1">
                            <p>Mon – Sat: 8:00 AM – 5:00 PM</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Contact;
