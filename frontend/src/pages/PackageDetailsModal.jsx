import React from 'react';
import { X, CheckCircle2, Utensils, Wind } from 'lucide-react';

const PackageDetailsModal = ({ isOpen, onClose, packageData, onSelect, isSelected }) => {
  if (!isOpen || !packageData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-32 bg-blue-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90"></div>
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
                <X size={20} />
            </button>
            <div className="absolute bottom-4 left-6 text-white">
                <h2 className="text-2xl font-bold">{packageData.name}</h2>
                <p className="text-blue-100 text-xs uppercase tracking-widest font-bold mt-1">Package Details</p>
            </div>
        </div>

        <div className="p-6">
            <div className="flex items-start justify-between mb-4">
                 <div>
                    <p className="text-3xl font-bold text-slate-800">
                        ₱{Number(packageData.price?.$numberDecimal || packageData.price).toLocaleString()}
                    </p>
                    <p className="text-slate-500 text-xs">per person</p>
                 </div>
                 {isSelected ? (
                     <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                         <CheckCircle2 size={14} /> Selected
                     </div>
                 ) : (
                     <button 
                        onClick={() => { onSelect(packageData); onClose(); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                     >
                        Select Package
                     </button>
                 )}
            </div>

            <div className="space-y-4 mb-6">
                <p className="text-slate-600 text-sm leading-relaxed">
                    {packageData.description}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                    {packageData.includesFood && (
                        <div className="flex items-center gap-2 text-slate-700 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                            <Utensils size={16} className="text-emerald-500"/> Includes Food
                        </div>
                    )}
                    {packageData.includesAC && (
                        <div className="flex items-center gap-2 text-slate-700 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                            <Wind size={16} className="text-cyan-500"/> Air Conditioned
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetailsModal;