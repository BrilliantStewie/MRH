import React, { useContext, useState, useEffect, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Plus, Edit, Trash2, X, 
  Search, Check, Box, ChevronDown, Filter, SlidersHorizontal, Tag,
  PhilippinePeso, ArrowUp, ArrowDown // Changed to standard arrows
} from 'lucide-react';

// --- SMART COMPONENT: Calculates exactly how many tags are hidden ---
const AmenitySection = ({ rawAmenities }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const containerRef = useRef(null);
  const innerRef = useRef(null);

  const getAmenityString = (a) => {
    if (!a) return null;
    if (typeof a === 'string') return a;
    return a.text || a.label || String(a);
  };

  const amenities = (rawAmenities || []).map(getAmenityString).filter(Boolean);

  useEffect(() => {
    const checkVisibility = () => {
      if (!containerRef.current || !innerRef.current) return;
      const container = containerRef.current;
      const tags = innerRef.current.children;
      const containerBottom = container.getBoundingClientRect().bottom - 4;
      let hidden = 0;
      for (let tag of tags) {
        if (tag.getBoundingClientRect().bottom > containerBottom) hidden++;
      }
      setHiddenCount(hidden);
    };

    checkVisibility();
    window.addEventListener('resize', checkVisibility);
    const timeout = setTimeout(checkVisibility, 50);
    return () => {
        window.removeEventListener('resize', checkVisibility);
        clearTimeout(timeout);
    };
  }, [amenities]);

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 5);
  };

  return (
    <div className="mt-auto">
      <div className="flex items-center justify-between mb-2 h-5">
        <div className="flex items-center gap-2">
          <Box size={12} className="text-indigo-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inclusions</span>
        </div>
        <div className={`transition-all duration-300 transform ${isScrolled ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            {hiddenCount > 0 && (
                <span className="text-[9px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    +{hiddenCount} MORE
                </span>
            )}
        </div>
      </div>
      <div ref={containerRef} onScroll={handleScroll} className="bg-slate-50 p-3 rounded-xl border border-slate-100 h-[84px] overflow-y-auto no-scrollbar hover:cursor-ns-resize transition-colors hover:bg-slate-100/50">
        <div ref={innerRef} className="flex flex-wrap gap-1.5">
          {amenities.length > 0 ? (
            amenities.map((am, i) => (
              <span key={i} className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div> 
                {am}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-400 italic">Standard inclusions apply.</span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const Packages = () => {
  const { allPackages, getAllPackages, addPackage, updatePackage, deletePackage } = useContext(AdminContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState(""); 
  
  // Price Filter State
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceSort, setPriceSort] = useState("asc"); // 'asc' or 'desc'

  // Form State
  const [amenityInput, setAmenityInput] = useState("");
  const initialFormState = { name: "", description: "", price: "", building: "All", amenities: [] };
  const [formData, setFormData] = useState(initialFormState);
  
  const filterRef = useRef(null);
  const priceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (priceRef.current && !priceRef.current.contains(event.target)) {
        setIsPriceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { getAllPackages(); }, []);

  // Helper to safely get price number
  const getPkgPrice = (pkg) => Number(pkg.price?.$numberDecimal || pkg.price || 0);

  const getAmenityString = (a) => {
    if (!a) return null;
    if (typeof a === 'string') return a;
    return a.text || a.label || String(a);
  };

  const uniqueAmenities = [
    ...new Set(allPackages.flatMap(pkg => (pkg.amenities || []).map(a => {
            const str = getAmenityString(a);
            return str ? str.toUpperCase() : null;
        }).filter(Boolean)))
  ].sort();

  const visibleFilters = filterSearch.trim() === "" 
    ? uniqueAmenities 
    : uniqueAmenities.filter(f => f.startsWith(filterSearch.toUpperCase()));

  // --- FILTERING LOGIC ---
  const filteredPackages = allPackages.filter((pkg) => {
    // 1. Search Logic
    const term = searchTerm.toLowerCase();
    const matchesName = pkg.name.toLowerCase().includes(term);
    const amenitiesList = (pkg.amenities || []).map(getAmenityString).filter(Boolean);
    const matchesSearch = matchesName || amenitiesList.some(txt => txt.toLowerCase().includes(term));
    
    // 2. Tag Filter Logic
    const matchesTag = activeFilter === "ALL" || amenitiesList.some(txt => txt.toUpperCase() === activeFilter);

    // 3. Price Logic
    const price = getPkgPrice(pkg);
    const matchesMin = minPrice === "" || price >= Number(minPrice);
    const matchesMax = maxPrice === "" || price <= Number(maxPrice);

    return matchesSearch && matchesTag && matchesMin && matchesMax;
  }).sort((a, b) => {
    // 4. Sort Logic
    const priceA = getPkgPrice(a);
    const priceB = getPkgPrice(b);
    return priceSort === 'asc' ? priceA - priceB : priceB - priceA;
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setAmenityInput("");
    setIsModalOpen(true);
  };

  const handleEdit = (pkg) => {
    setEditingId(pkg._id);
    const normalizedAmenities = pkg.amenities ? pkg.amenities.map(getAmenityString).filter(Boolean) : [];
    setFormData({ ...pkg, price: pkg.price?.$numberDecimal || pkg.price, amenities: normalizedAmenities });
    setAmenityInput("");
    setIsModalOpen(true);
  };

  const handleManualAdd = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && amenityInput.trim() !== "") {
      e.preventDefault();
      const newAmenity = amenityInput.trim().toUpperCase();
      if (!formData.amenities.includes(newAmenity)) {
        setFormData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity] }));
      }
      setAmenityInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        let finalAmenities = [...formData.amenities];
        if (amenityInput.trim()) {
            const pendingAmenity = amenityInput.trim().toUpperCase();
            if (!finalAmenities.includes(pendingAmenity)) {
                finalAmenities.push(pendingAmenity);
            }
        }
        const submissionData = { ...formData, amenities: finalAmenities };
        if (editingId) await updatePackage(editingId, submissionData);
        else await addPackage(submissionData);
        await getAllPackages(); 
        setIsModalOpen(false);
    } catch (error) { console.error(error); }
  };

  const clearFilter = (e) => {
    e.stopPropagation();
    setActiveFilter("ALL");
  };

  const isPriceFilterActive = minPrice !== "" || maxPrice !== "";

  return (
    <div className="min-h-screen bg-slate-50/50 pt-6 pb-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 text-center md:text-left">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accommodations</h1>
        <p className="text-slate-500 mt-2 font-medium">Manage listing inventory and inclusions.</p>
      </div>

      {/* --- CONTROL BAR (SEARCH, TAGS, PRICE) --- */}
      <div className="sticky top-4 z-40 max-w-7xl mx-auto mb-8">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-1.5 flex flex-col md:flex-row items-center gap-2">
            
            {/* Search Input */}
            <div className="relative flex-grow w-full group">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search packages or amenities..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all" 
                />
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-200 mx-1"></div>

            <div className="flex w-full md:w-auto gap-2">
                
                {/* --- PRICE FILTER --- */}
                <div className="relative w-full md:w-auto min-w-[140px]" ref={priceRef}>
                    <button 
                        onClick={() => setIsPriceDropdownOpen(!isPriceDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                            isPriceFilterActive
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <PhilippinePeso size={16} />
                            <span>Price</span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPriceDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isPriceDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-full md:w-[260px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                             {/* Sorting */}
                             <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setPriceSort('asc')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                        priceSort === 'asc' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Low-High <ArrowUp size={14}/>
                                </button>
                                <button 
                                    onClick={() => setPriceSort('desc')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                        priceSort === 'desc' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    High-Low <ArrowDown size={14}/>
                                </button>
                             </div>

                             {/* Range */}
                             <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Min Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₱</span>
                                        <input 
                                            type="number" 
                                            value={minPrice} 
                                            onChange={(e) => setMinPrice(e.target.value)} 
                                            placeholder="0"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Max Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₱</span>
                                        <input 
                                            type="number" 
                                            value={maxPrice} 
                                            onChange={(e) => setMaxPrice(e.target.value)} 
                                            placeholder="Any"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                             </div>

                             {/* Actions */}
                             {isPriceFilterActive && (
                                <button 
                                    onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                                    className="w-full mt-4 text-xs font-bold text-rose-500 hover:bg-rose-50 py-2 rounded-lg transition-colors"
                                >
                                    Clear Price Filter
                                </button>
                             )}
                        </div>
                    )}
                </div>

                {/* --- AMENITY FILTER --- */}
                <div className="relative w-full md:w-auto min-w-[200px]" ref={filterRef}>
                    <button 
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} 
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                        activeFilter !== "ALL" 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            {activeFilter === "ALL" ? <SlidersHorizontal size={16} /> : <Filter size={16} />}
                            <span className="uppercase truncate max-w-[100px]">
                            {activeFilter === "ALL" ? "Tags" : activeFilter}
                            </span>
                        </div>

                        <div className="flex items-center ml-2">
                        {activeFilter !== "ALL" ? (
                            <div role="button" onClick={clearFilter} className="p-1 rounded-full hover:bg-indigo-200 text-indigo-500 transition-colors">
                            <X size={14} />
                            </div>
                        ) : (
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                        )}
                        </div>
                    </button>

                    {/* Amenity Dropdown Menu */}
                    {isFilterDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-full md:w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            {uniqueAmenities.length === 0 ? (
                            <div className="px-4 py-8 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <Tag size={18} className="text-slate-300" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 uppercase">No tags available</p>
                                <p className="text-[10px] text-slate-400 mt-1 px-4 leading-relaxed">
                                    Add amenities to your packages to filter by them here.
                                </p>
                            </div>
                            ) : (
                            <>
                                <div className="p-3 bg-slate-50 border-b border-slate-100">
                                    <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        autoFocus 
                                        type="text" 
                                        placeholder="Find a tag..." 
                                        value={filterSearch} 
                                        onChange={(e) => setFilterSearch(e.target.value)} 
                                        className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-bold uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" 
                                    />
                                    </div>
                                </div>

                                <div className="max-h-[260px] overflow-y-auto no-scrollbar p-1">
                                    {!filterSearch && (
                                        <button 
                                        onClick={() => { setActiveFilter("ALL"); setIsFilterDropdownOpen(false); }} 
                                        className={`w-full text-left px-3 py-2.5 mb-1 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${activeFilter === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                        <span>SHOW ALL ITEMS</span>
                                        {activeFilter === "ALL" && <Check size={14} />}
                                        </button>
                                    )}
                                    
                                    {visibleFilters.length > 0 ? visibleFilters.map(filter => (
                                        <button 
                                            key={filter} 
                                            onClick={() => { setActiveFilter(filter); setIsFilterDropdownOpen(false); setFilterSearch(""); }} 
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all mb-1 ${
                                            activeFilter === filter 
                                                ? 'bg-indigo-50 text-indigo-700' 
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <span className="truncate">{filter}</span> 
                                            {activeFilter === filter && <Check size={14} className="text-indigo-600" />}
                                        </button>
                                    )) : (
                                        <div className="px-4 py-8 text-center flex flex-col items-center">
                                            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                            <Search size={14} className="text-slate-300" />
                                            </div>
                                            <p className="text-xs text-slate-400 italic font-bold">No tags match "{filterSearch}"</p>
                                        </div>
                                    )}
                                </div>
                            </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* PACKAGE GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <button onClick={handleOpenCreate} className="group flex flex-col items-center justify-center min-h-[440px] rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 hover:bg-white hover:border-indigo-400 hover:shadow-xl transition-all duration-300 gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all"><Plus size={28} /></div>
            <span className="font-bold text-slate-500 group-hover:text-indigo-600">New Package</span>
        </button>

        {filteredPackages.map((pkg, idx) => (
            <div key={pkg._id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col min-h-[440px] border border-slate-100">
                <div className={`h-28 p-6 flex justify-between items-start ${idx % 3 === 0 ? 'bg-slate-800' : idx % 3 === 1 ? 'bg-indigo-900' : 'bg-slate-700'}`}>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-white">₱{Number(pkg.price?.$numberDecimal || pkg.price).toLocaleString()}</span>
                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Monthly Rate</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(pkg)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={() => deletePackage(pkg._id)} className="p-2 bg-white/20 hover:bg-rose-500 text-white rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{pkg.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-6">{pkg.description || "No description provided."}</p>
                    <AmenitySection rawAmenities={pkg.amenities} />
                </div>
            </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center">
                 <h2 className="font-bold uppercase tracking-widest text-sm">{editingId ? "Edit" : "New"} Listing</h2>
                 <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                 <input type="text" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold outline-none" />
                 <input type="number" required placeholder="Price" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold outline-none" />
                 <textarea rows={2} placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none" />
                 
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Manage Amenities</label>
                    <div className="flex flex-wrap gap-2 mb-4 max-h-32 overflow-y-auto no-scrollbar">
                        {formData.amenities.map((am, i) => (
                            <span key={i} className="bg-white border px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 uppercase shadow-sm">
                                {am} <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setFormData({...formData, amenities: formData.amenities.filter((_, idx) => idx !== i)})} />
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Add inclusion..." value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)} onKeyDown={handleManualAdd} className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-500 shadow-inner" />
                        <button type="button" onClick={handleManualAdd} className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-indigo-600 transition-colors shadow-lg"><Plus size={20} /></button>
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-slate-900/20 uppercase tracking-widest text-xs">{editingId ? "Update Listing" : "Create Listing"}</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Packages;