import React from 'react';
import { assets } from '../assets/assets';
import { MapPin, Phone, Mail, Briefcase, ArrowRight } from 'lucide-react';

const Contact = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 pt-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Contact <span className="text-blue-600">Us</span>
          </h1>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            We are here to help. Reach out to us for any inquiries or support.
          </p>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex flex-col md:flex-row gap-12 items-start justify-center">
          
          {/* Left Column: Image */}
          <div className="w-full md:w-5/12">
            <div className="relative group">
                {/* Decorative offset background */}
                <div className="absolute -inset-4 bg-blue-100 rounded-[2.5rem] -z-10 transform -rotate-2 group-hover:rotate-1 transition-transform duration-500"></div>
                
                <img 
                    className="w-full h-auto rounded-3xl shadow-xl object-cover border border-slate-200" 
                    src={assets.contact_image} 
                    alt="Contact Us" 
                />
            </div>
          </div>

          {/* Right Column: Info Cards */}
          <div className="w-full md:w-6/12 space-y-8">
            
            {/* Office Info Card */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    Our Office
                </h3>
                
                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 text-sm">Location</p>
                            <p className="text-slate-500 text-sm leading-relaxed mt-1">
                                00000 Willms Station <br /> 
                                Suite 000, Washington, USA
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 text-sm">Phone</p>
                            <p className="text-slate-500 text-sm mt-1">(000) 000-0000</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <Mail size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 text-sm">Email</p>
                            <p className="text-slate-500 text-sm mt-1">greatstackdev@gmail.com</p>
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

export default Contact