import React from 'react';
import { assets } from '../assets/assets';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, ArrowRight, Cross } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 pt-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto px-8">
        
        {/* --- MAIN LAYOUT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
          
          {/* 1. PRIMARY BRAND BLOCK (5 Columns) */}
          <div className="lg:col-span-5 space-y-10">
            <div className="flex items-start gap-6">
              {/* Logo Container - Designed to stand out professionally */}
              <div className="shrink-0 w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-3 shadow-sm">
                 <img 
                    src={assets.logo} 
                    alt="Mercedarian Logo" 
                    className="w-full h-full object-contain" 
                 />
              </div>
              <div className="space-y-1 pt-1">
                <h2 className="text-2xl font-outfit font-bold tracking-[0.1em] uppercase leading-none">
                    Mercedarian
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-blue-600">
                    Retreat House
                </p>
              </div>
            </div>
            
            <p className="text-slate-500 text-base leading-relaxed max-w-sm font-light">
              A physical response to the noise of the modern world. We offer a distinct architectural experience designed for prayer and the restoration of the soul.
            </p>

            <div className="flex gap-6">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                    <a key={i} href="#" className="text-slate-300 hover:text-blue-600 transition-all duration-300 transform hover:-translate-y-1">
                        <Icon size={20} strokeWidth={1.5} />
                    </a>
                ))}
            </div>
          </div>

          {/* 2. NAVIGATION (2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">Sanctuary</h3>
            <ul className="space-y-5">
              {['Home', 'Rooms', 'About', 'Contact'].map((item) => (
                 <li key={item}>
                   <Link 
                     to={item === 'Home' ? '/' : `/${item.toLowerCase()}`} 
                     className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 group"
                   >
                     {item}
                     <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                   </Link>
                 </li>
              ))}
            </ul>
          </div>

          {/* 3. CONTACT & LOCATION (5 Columns) */}
          <div className="lg:col-span-5 lg:pl-12 lg:border-l lg:border-slate-50">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300 mb-8">Get In Touch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <MapPin size={18} className="text-blue-600 shrink-0 mt-1" />
                        <span className="text-sm text-slate-600 leading-relaxed font-light">
                            Poblacion, Dauis, <br />
                            Bohol, Philippines
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Phone size={18} className="text-blue-600 shrink-0" />
                        <span className="text-sm text-slate-600 font-light">(+63) 000 0000 000</span>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Mail size={18} className="text-blue-600 shrink-0" />
                        <span className="text-sm text-slate-600 font-light truncate">info@mercedarian.com</span>
                    </div>
                    
                </div>
            </div>
          </div>

        </div>

      

      </div>
    </footer>
  );
};

export default Footer;