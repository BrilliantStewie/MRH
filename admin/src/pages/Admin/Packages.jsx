import React, { useContext, useState, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Plus, Edit2, Trash2, X, 
  Utensils, Wind, Package, LayoutGrid, Check
} from 'lucide-react';

const Packages = () => {
  const {
    allPackages,
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,
  } = useContext(AdminContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Initial Form State (Removed 'building' specific selection)
  const initialFormState = {
    name: "",
    description: "",
    price: "",
    building: "All", // Defaulting to 'All' or 'General' internally
    includesFood: false,
    includesAC: false,
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    getAllPackages();
  }, []);

  // Handlers
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleEdit = (pkg) => {
    setEditingId(pkg._id);
    setFormData({
      ...pkg,
      price: pkg.price?.$numberDecimal || pkg.price,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updatePackage(editingId, formData);
    } else {
      await addPackage(formData);
    }
    setIsModalOpen(false);
  };

  const formatPrice = (price) => {
    const val = price && price.$numberDecimal ? price.$numberDecimal : price;
    return Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-slate-800">
      
      {/* --- HEADER SECTION --- */}
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Package Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage standard accommodation rates and amenities.</p>
          </div>
          
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Add General Package</span>
          </button>
        </div>

        {/* --- LIST VIEW --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">Available Packages</h2>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Total: {allPackages.length}
            </div>
          </div>

          {allPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <LayoutGrid size={48} className="mb-4 opacity-20" />
              <p>No packages created yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {allPackages.map((pkg) => (
                <div key={pkg._id} className="group p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                  
                  {/* Generic Package Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Package size={24} />
                    </div>
                  </div>

                  {/* Main Details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg truncate">{pkg.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{pkg.description || "No description provided."}</p>
                    
                    {/* Amenities Pills */}
                    <div className="flex gap-2 mt-2">
                        {/* Food Pill */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                          ${pkg.includesFood ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100 decoration-line-through'}
                        `}>
                          <Utensils size={10} /> {pkg.includesFood ? "Food Included" : "No Food"}
                        </span>

                        {/* AC Pill */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                          ${pkg.includesAC ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100 decoration-line-through'}
                        `}>
                          <Wind size={10} /> {pkg.includesAC ? "With AC" : "Fan Only"}
                        </span>
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 min-w-[200px] border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase">Rate per Pax</p>
                      <p className="text-xl font-bold text-slate-900">₱{formatPrice(pkg.price)}</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(pkg)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deletePackage(pkg._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {editingId ? "Edit Package Details" : "New General Package"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Name & Price */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Package Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="e.g. Individual (Aircon + Food)"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Price</label>
                  <input 
                    type="number" 
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                <textarea 
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                  placeholder="Details about this package..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {/* Amenities Checkboxes */}
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 flex-1 transition-colors">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.includesFood ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    {formData.includesFood && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-bold text-gray-700">Include Food</span>
                  <input type="checkbox" className="hidden" checked={formData.includesFood} onChange={(e) => setFormData({...formData, includesFood: e.target.checked})} />
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 flex-1 transition-colors">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.includesAC ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    {formData.includesAC && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-bold text-gray-700">Include AC</span>
                  <input type="checkbox" className="hidden" checked={formData.includesAC} onChange={(e) => setFormData({...formData, includesAC: e.target.checked})} />
                </label>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all mt-4">
                {editingId ? "Save Changes" : "Create Package"}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Packages;