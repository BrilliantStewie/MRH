import React, { useContext, useEffect, useState, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Plus, Edit, Trash2, Package, Layers, Tag, X, 
  ChevronDown, Settings2, RotateCcw, Check, Edit3,
  Search, Briefcase, Coffee, Home
} from "lucide-react";
import { toast } from "react-toastify";

const Packages = () => {
  const {
    allPackages,
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,
    roomTypes,
  } = useContext(AdminContext);

  // --- MODAL & UI STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeRef = useRef(null);

  // --- CATEGORY MANAGEMENT ---
  const [packageTypes, setPackageTypes] = useState([]);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [editingTypeOriginal, setEditingTypeOriginal] = useState(null);
  const [tempTypeName, setTempTypeName] = useState("");

  const initialForm = {
    name: "",
    packageType: "",
    roomType: "",
    price: "",
    description: "",
    amenities: ""
  };

  const [formData, setFormData] = useState(initialForm);

  // --- SYNC & CLICK OUTSIDE ---
  useEffect(() => {
    const systemTypes = ["Room Package", "Venue Package", "Amenity"];
    const existingTypes = [...new Set(allPackages?.map(p => p.packageType).filter(Boolean))];
    setPackageTypes([...new Set([...systemTypes, ...existingTypes])]);

    const handleClickOutside = (event) => {
      if (typeRef.current && !typeRef.current.contains(event.target)) {
        setShowTypeDropdown(false);
        resetTypeStates();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allPackages]);

  const resetTypeStates = () => {
    setIsAddingNewType(false);
    setEditingTypeOriginal(null);
    setTempTypeName("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialForm);
    resetTypeStates();
  };

  // --- TYPE MANAGEMENT HANDLERS ---
  const handleSaveType = () => {
    if (!tempTypeName.trim()) return toast.warn("Name required");
    if (editingTypeOriginal) {
      setPackageTypes(prev => prev.map(t => t === editingTypeOriginal ? tempTypeName.trim() : t));
      toast.success("Updated category");
    } else {
      setPackageTypes(prev => [...prev, tempTypeName.trim()]);
      toast.success("Added category");
    }
    resetTypeStates();
  };

  const handleDeleteType = (e, typeName) => {
    e.stopPropagation();
    if (!window.confirm(`Remove category "${typeName}"?`)) return;
    setPackageTypes(prev => prev.filter(t => t !== typeName));
    toast.success("Category removed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: Number(formData.price),
      amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()) : []
    };
    if (editingId) await updatePackage(editingId, data);
    else await addPackage(data);
    closeModal();
    getAllPackages();
  };

  return (
    <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER DESIGN */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Package size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Inventory Management</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Packages</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="group flex items-center gap-3 bg-slate-900 hover:bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            <span className="text-xs uppercase tracking-widest">Create New</span>
          </button>
        </div>

        {/* TABLE DESIGN */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Listing Name</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allPackages?.map(pkg => (
                <tr key={pkg._id} className="group hover:bg-indigo-50/30 transition-all">
                  <td className="px-8 py-6">
                    <p className="font-extrabold text-slate-800 text-lg tracking-tight">{pkg.name}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-1 flex items-center gap-2">
                      <Home size={12} /> {pkg.roomType?.name || "Standalone"}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{pkg.packageType}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-xl font-black text-slate-900">₱{Number(pkg.price).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button onClick={() => {
                        setEditingId(pkg._id);
                        setFormData({
                          name: pkg.name,
                          packageType: pkg.packageType,
                          roomType: pkg.roomType?._id || "",
                          price: pkg.price,
                          description: pkg.description || "",
                          amenities: pkg.amenities?.join(", ") || ""
                        });
                        setIsModalOpen(true);
                      }} className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition-all">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={async () => {
                        if(window.confirm("Permanent Delete?")) { await deletePackage(pkg._id); getAllPackages(); }
                      }} className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-xl shadow-sm border border-slate-100 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DESIGN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full md:h-auto md:max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {editingId ? "Edit Offer" : "New Offer"}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Package Configuration</p>
              </div>
              <button onClick={closeModal} className="p-3 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 no-scrollbar">
              
              {/* INPUT: NAME */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Package Title</label>
                <input type="text" required value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300" placeholder="e.g. Wedding Luxe Package" />
              </div>

              {/* INPUT: CATEGORY (The Hover-Action Menu) */}
              <div className="relative space-y-3" ref={typeRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Service Category</label>
                <button type="button" onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-lg shadow-sm"><Tag size={14} className="text-indigo-500" /></div>
                    <span className={formData.packageType ? "text-slate-900" : "text-slate-400"}>
                      {formData.packageType || "Select category..."}
                    </span>
                  </div>
                  <ChevronDown size={18} className={`transition-transform duration-300 ${showTypeDropdown ? 'rotate-180 text-indigo-500' : 'text-slate-300'}`} />
                </button>
                
                {showTypeDropdown && (
                  <div className="absolute z-30 top-full mt-2 w-full bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 space-y-1 max-h-56 overflow-y-auto no-scrollbar">
                      {packageTypes.map((t) => (
                        <div key={t} className="group relative flex items-center justify-between p-4 hover:bg-indigo-50 rounded-[1.5rem] cursor-pointer transition-all">
                          <span onClick={() => { setFormData({...formData, packageType: t}); setShowTypeDropdown(false); }} className="flex-1 text-sm font-bold text-slate-600 group-hover:text-indigo-700 uppercase tracking-tight">{t}</span>
                          
                          {/* HOVER ACTIONS IN DROPDOWN */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button type="button" onClick={() => { setEditingTypeOriginal(t); setTempTypeName(t); }} className="p-2 bg-white text-indigo-500 rounded-xl shadow-sm"><Edit size={12}/></button>
                            <button type="button" onClick={(e) => handleDeleteType(e, t)} className="p-2 bg-white text-rose-500 rounded-xl shadow-sm"><Trash2 size={12}/></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ADD/EDIT SUB-FORM */}
                    {(isAddingNewType || editingTypeOriginal) ? (
                      <div className="p-6 bg-slate-50 space-y-4 border-t border-slate-100">
                        <input autoFocus value={tempTypeName} onChange={(e)=>setTempTypeName(e.target.value)} placeholder="Type name..." className="w-full px-4 py-3 bg-white rounded-xl text-xs font-bold outline-none ring-2 ring-indigo-500/10" />
                        <div className="flex gap-2">
                          <button type="button" onClick={handleSaveType} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Confirm</button>
                          <button type="button" onClick={resetTypeStates} className="flex-1 py-3 bg-white text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setIsAddingNewType(true)} className="w-full p-5 bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] border-t border-slate-100 hover:bg-indigo-600 hover:text-white transition-all">
                        + New Category
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* GRID: ROOM LINK & PRICE */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Room Sync</label>
                  <select value={formData.roomType} onChange={(e)=>setFormData({...formData, roomType:e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-slate-900 appearance-none">
                    <option value="">Stand-alone</option>
                    {roomTypes?.map(rt => <option key={rt._id} value={rt._id}>{rt.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Rate (₱)</label>
                  <input type="number" required value={formData.price} onChange={(e)=>setFormData({...formData, price:e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none text-indigo-600" placeholder="0" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Offer Highlights</label>
                <input type="text" placeholder="Coffee, WiFi, Parking (split by comma)" value={formData.amenities} onChange={(e)=>setFormData({...formData, amenities:e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none transition-all" />
              </div>

            </div>

            <div className="p-10 bg-white border-t border-slate-50 sticky bottom-0">
              <button onClick={handleSubmit} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-2xl shadow-indigo-100 transition-all active:scale-[0.97] flex items-center justify-center gap-3">
                <Check size={20} />
                <span className="text-xs">{editingId ? "Apply Updates" : "Publish Offer"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;