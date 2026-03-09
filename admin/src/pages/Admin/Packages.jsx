import React, { useContext, useEffect, useState, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";

const Packages = () => {
  const {
    allPackages,
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,
    roomTypes,
    getRoomTypes,
  } = useContext(AdminContext);

  const [filterPackageType, setFilterPackageType] = useState("All");
const [filterRoomType, setFilterRoomType] = useState("All");
const [isPackageFilterOpen, setIsPackageFilterOpen] = useState(false);
const [isRoomFilterOpen, setIsRoomFilterOpen] = useState(false);
const packageFilterRef = useRef(null);
const roomFilterRef = useRef(null);
  /* =========================================
  UI & FEEDBACK STATES
  ========================================= */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Feedback states for custom UI
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, type: "" });
  const [deleteContext, setDeleteContext] = useState(null);

  // Dropdown States
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);

  const [amenityInput, setAmenityInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Refs for closing dropdowns when clicking outside
  const dropdownRef = useRef(null);
  const roomDropdownRef = useRef(null);

  const initialFormState = {
    name: "",
    packageType: "",
    roomType: "",
    price: "",
    description: "",
    amenities: [],
  };

  const [formData, setFormData] = useState(initialFormState);

  const [packageTypes, setPackageTypes] = useState([
    "Room Package",
    "Venue Package",
    "Amenity",
  ]);

  const [newType, setNewType] = useState("");

  /* =========================================
  LOAD DATA & EVENT LISTENERS
  ========================================= */
  useEffect(() => {
    getAllPackages();
    getRoomTypes();
  }, []);

  useEffect(() => {
  const handleClickOutside = (event) => {

    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsTypeDropdownOpen(false);
    }

    if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target)) {
      setIsRoomDropdownOpen(false);
    }

    // NEW: Package filter
    if (packageFilterRef.current && !packageFilterRef.current.contains(event.target)) {
      setIsPackageFilterOpen(false);
    }

    // NEW: Room filter
    if (roomFilterRef.current && !roomFilterRef.current.contains(event.target)) {
      setIsRoomFilterOpen(false);
    }

  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
  /* =========================================
  FEEDBACK HELPERS
  ========================================= */
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  /* =========================================
  HANDLE INPUT
  ========================================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "packageType") {
      const isRoomPackage = value.toLowerCase() === "room package";

      setFormData((prev) => ({
        ...prev,
        packageType: value,
        roomType: isRoomPackage ? prev.roomType : "", // clear room if not room package
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  /* =========================================
  MODAL CONTROLS
  ========================================= */
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg) => {
    setEditingId(pkg._id);

    const safeRoomId =
      pkg.packageType?.toLowerCase() === "room package"
        ? pkg.roomType?._id || pkg.roomType || ""
        : "";

    setFormData({
      name: pkg.name || "",
      packageType: pkg.packageType || "",
      roomType: safeRoomId,
      price: pkg.price || "",
      description: pkg.description || "",
      amenities: Array.isArray(pkg.amenities) ? pkg.amenities : [],
    });

    if (pkg.packageType && !packageTypes.includes(pkg.packageType)) {
      setPackageTypes([...packageTypes, pkg.packageType]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setIsTypeDropdownOpen(false);
    setIsRoomDropdownOpen(false);
  };

  /* =========================================
  AMENITIES & TYPE MANAGEMENT
  ========================================= */
  const handleAddAmenity = (e) => {
  if (e) e.preventDefault();

  const trimmed = amenityInput.trim();

  if (!trimmed) return;

  // Convert to ALL CAPS
  const upperAmenity = trimmed.toUpperCase();

  if (formData.amenities.includes(upperAmenity)) {
    setAmenityInput("");
    return;
  }

  setFormData((prev) => ({
    ...prev,
    amenities: [...prev.amenities, upperAmenity],
  }));

  setAmenityInput("");
};

  const handleRemoveAmenity = (amenityToRemove) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((a) => a !== amenityToRemove)
    });
  };

  const addPackageType = (e) => {
    e?.preventDefault();
    if (!newType.trim()) return;

    const trimmedType = newType.trim();
    if (!packageTypes.includes(trimmedType)) {
      setPackageTypes([...packageTypes, trimmedType]);
    }

    setFormData({ ...formData, packageType: trimmedType });
    setNewType("");
    setIsTypeDropdownOpen(false);
  };

  const handleEditPackageType = (index, oldType, e) => {
    e.stopPropagation();
    const editedType = window.prompt("Edit Package Type:", oldType);
    if (editedType && editedType.trim() !== "" && editedType !== oldType) {
      const updatedTypes = [...packageTypes];
      updatedTypes[index] = editedType.trim();
      setPackageTypes(updatedTypes);
      if (formData.packageType === oldType) {
        setFormData({ ...formData, packageType: editedType.trim() });
      }
    }
  };

  const handleDeletePackageType = (index, typeToDelete, e) => {
    e.stopPropagation();
    setDeleteContext({ index, typeToDelete });
    setConfirmDelete({ show: true, id: null, type: "type" });
  };

  /* =========================================
  SUBMIT & DELETE LOGIC
  ========================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.packageType) {
      showToast("Please select a package type.", "error");
      return;
    }
    const isRoomPackage =
      formData.packageType?.toLowerCase() === "room package";

    if (isRoomPackage && !formData.roomType) {
      showToast("Please select a room base for room packages.", "error");
      return;
    }

    const payload = {
      ...formData,
      roomType:
        formData.packageType?.toLowerCase() === "room package"
          ? formData.roomType
          : null,
    };

    let success;
    if (editingId) {
      success = await updatePackage(editingId, payload);
    } else {
      success = await addPackage(payload);
    }

    if (success) {
      handleCloseModal();
      showToast(editingId ? "Package updated successfully" : "Package created successfully");
    }
  };

  const handleDeleteTrigger = (id) => {
    setConfirmDelete({ show: true, id, type: "package" });
  };

  const proceedWithDelete = async () => {
    if (confirmDelete.type === "package") {
      const success = await deletePackage(confirmDelete.id);
      if (success) showToast("Package deleted successfully");
    } else if (confirmDelete.type === "type") {
      const { index, typeToDelete } = deleteContext;
      const updatedTypes = packageTypes.filter((_, i) => i !== index);
      setPackageTypes(updatedTypes);
      if (formData.packageType === typeToDelete) {
        setFormData({ ...formData, packageType: "" });
      }
      showToast("Category removed");
    }
    setConfirmDelete({ show: false, id: null, type: "" });
    setDeleteContext(null);
  };

  /* =========================================
  FILTER DATA
  ========================================= */
  const filteredPackages = allPackages.filter((pkg) => {
  const searchLower = searchTerm.toLowerCase();
  
  // Existing Search Filter
  const matchesSearch = 
    (pkg.name || "").toLowerCase().includes(searchLower) ||
    (pkg.packageType || "").toLowerCase().includes(searchLower);

  // Package Type Filter
  const matchesPkgType = filterPackageType === "All" || pkg.packageType === filterPackageType;

  // Room Type Filter (handle object/ID comparison)
  const pkgRoomId = String(pkg.roomType?._id || pkg.roomType || "");
  const matchesRoomType = filterRoomType === "All" || pkgRoomId === filterRoomType;

  return matchesSearch && matchesPkgType && matchesRoomType;
});

  /* =========================================
  UI CLASSES
  ========================================= */
  const inputClass =
    "w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-400 hover:bg-gray-50";
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans text-gray-900 relative">

      {/* HEADER SECTION */}
<div className="flex flex-col gap-6">
  {/* Title Row */}
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
        Packages
      </h1>
      <p className="text-gray-500 mt-2 text-sm max-w-md">
        Design and manage your service offerings, room inclusions, and custom venue bundles.
      </p>
    </div>
    
    <button
      onClick={handleOpenAddModal}
      className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md active:scale-95 w-full md:w-auto"
    >
      + Create Package
    </button>
  </div>

 <div className="flex items-center justify-between">

  {/* SEARCH */}
<div className="bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm w-full md:w-72">
  <input
    type="text"
    placeholder="Search packages..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full text-sm bg-transparent outline-none placeholder-gray-400"
  />
</div>

  <div className="bg-white p-3 rounded-2xl border border-gray-200/60 shadow-sm flex gap-2 items-center">

  {/* PACKAGE TYPE FILTER */}
<div ref={packageFilterRef} className="relative">
  <button
    onClick={() => setIsPackageFilterOpen(!isPackageFilterOpen)}
    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-100"
  >
    {/* Update this line to show "All Types" instead of just "All" */}
    {filterPackageType === "All" ? "All Types" : filterPackageType}
    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </button>

  {isPackageFilterOpen && (
    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-lg p-2 z-50">
      
      <div
        onClick={() => {
          setFilterPackageType("All");
          setIsPackageFilterOpen(false);
        }}
        className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer text-sm"
      >
        All Types
      </div>

      {packageTypes.map(t => (
        <div
          key={t}
          onClick={() => {
            setFilterPackageType(t);
            setIsPackageFilterOpen(false);
          }}
          className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer text-sm"
        >
          {t}
        </div>
      ))}
    </div>
  )}
</div>


  {/* ROOM FILTER */}
  <div ref={roomFilterRef} className="relative">
    <button
      onClick={() => setIsRoomFilterOpen(!isRoomFilterOpen)}
      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-100"
    >
      {filterRoomType === "All"
        ? "All Rooms"
        : roomTypes.find(r => r._id === filterRoomType)?.name}

      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    {isRoomFilterOpen && (
      <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-lg p-2 z-50">

        <div
          onClick={() => {
            setFilterRoomType("All");
            setIsRoomFilterOpen(false);
          }}
          className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer text-sm"
        >
          All Rooms
        </div>

        {roomTypes.map(rt => (
          <div
            key={rt._id}
            onClick={() => {
              setFilterRoomType(rt._id);
              setIsRoomFilterOpen(false);
            }}
            className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer text-sm"
          >
            {rt.name}
          </div>
        ))}

      </div>
    )}
  </div>


  {/* RESET */}
  <button
    onClick={() => {
      setSearchTerm("");
      setFilterPackageType("All");
      setFilterRoomType("All");
    }}
    className="text-xs font-bold text-gray-400 hover:text-red-500 px-2 transition-colors"
  >
    Reset
  </button>

</div>

</div>
</div>

      {/* COMPACT CARDS GRID */}
      {filteredPackages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/60 py-20 flex flex-col items-center justify-center space-y-3 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-gray-500 font-semibold text-lg">No packages found</p>
          <p className="text-gray-400 text-sm">Try adjusting your search or create a new one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPackages.map((pkg) => {
            const roomId = pkg.roomType?._id || pkg.roomType;
            const localRoomTypeMatch = roomTypes.find((rt) => String(rt._id) === String(roomId));
            const roomName = localRoomTypeMatch ? localRoomTypeMatch.name : (pkg.roomType?.name || "No rooms added");
            const pkgAmenities = Array.isArray(pkg.amenities) ? pkg.amenities : [];

            const pType = (pkg.packageType || "").toLowerCase();
            let theme = {
              headerBg: "bg-gradient-to-br from-blue-50/80 to-indigo-50/80",
              borderColor: "border-blue-100/60",
              hoverBorder: "hover:border-blue-300",
              titleColor: "text-blue-950",
              priceColor: "text-blue-700",
              badge: "bg-white text-blue-700 border-blue-200",
            };

            if (pType.includes("room")) {
              theme = {
                headerBg: "bg-gradient-to-br from-emerald-50/80 to-teal-50/80",
                borderColor: "border-emerald-100/60",
                hoverBorder: "hover:border-emerald-300",
                titleColor: "text-emerald-950",
                priceColor: "text-emerald-700",
                badge: "bg-white text-emerald-700 border-emerald-200",
              };
            } else if (pType.includes("venue")) {
              theme = {
                headerBg: "bg-gradient-to-br from-gray-50 to-slate-100/80",
                borderColor: "border-slate-200/60",
                hoverBorder: "hover:border-slate-400",
                titleColor: "text-slate-900",
                priceColor: "text-slate-800",
                badge: "bg-white text-slate-700 border-slate-200",
              };
            }

            return (
              <div
                key={pkg._id}
                className={`group relative bg-white rounded-xl border ${theme.borderColor} shadow-sm transition-all duration-200 flex flex-col overflow-hidden ${theme.hoverBorder}`}
              >
                <div className={`p-4 ${theme.headerBg} border-b ${theme.borderColor} relative`}>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(pkg)}
                      className="p-1.5 text-gray-500 bg-white/90 rounded-md border border-gray-200 hover:text-blue-600 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
  onClick={(e) => {
    e.stopPropagation();
    handleDeleteTrigger(pkg._id);
  }}
  className="p-1.5 text-gray-500 bg-white/90 rounded-md border border-gray-200 hover:text-red-600 shadow-sm"
>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border mb-2 ${theme.badge}`}>
                    {pkg.packageType}
                  </span>

                  <h3 className={`text-base font-bold ${theme.titleColor} leading-tight mb-2 pr-8 line-clamp-1`}>
                    {pkg.name}
                  </h3>

                  <div className="flex items-baseline">
                    <span className={`text-xs font-bold ${theme.priceColor} opacity-70 mr-0.5`}>₱</span>
                    <span className={`text-xl font-black ${theme.priceColor} tracking-tight`}>
                      {Number(pkg.price).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow bg-white">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className={`text-[11px] truncate ${roomName !== "No room selected" ? "font-bold text-gray-600" : "text-gray-400 italic"}`}>
                      {roomName}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-normal mb-4 flex-grow line-clamp-2">
                    {pkg.description || "No additional details provided."}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {pkgAmenities.slice(0, 3).map((am, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tight">{am}</span>
                      </div>
                    ))}
                    {pkgAmenities.length > 3 && (
                      <span className="text-[9px] font-bold text-gray-400 px-1 pt-0.5">+{pkgAmenities.length - 3} MORE</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-lg p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">

            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white relative z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {editingId ? "Edit Package" : "Create Package"}
                </h2>
                <p className="text-gray-500 text-xs mt-1">Fill out the details below to save this package.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto bg-white">
              <form id="package-form" onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <label className={labelClass}>Package Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Ultimate Honeymoon Suite"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative" ref={dropdownRef}>
                    <label className={labelClass}>Package Type</label>
                    <div
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className={`${inputClass} cursor-pointer flex justify-between items-center select-none ${!formData.packageType && "text-gray-400"}`}
                    >
                      {formData.packageType || "Select Type"}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {isTypeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 flex flex-col overflow-hidden">
                        <div className="overflow-y-auto max-h-36 py-2">
                          {packageTypes.map((type, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                setFormData({ ...formData, packageType: type });
                                setIsTypeDropdownOpen(false);
                              }}
                              className="group flex justify-between items-center px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 transition-colors"
                            >
                              <span>{type}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleEditPackageType(index, type, e)}
                                  className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-100"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeletePackageType(index, type, e)}
                                  className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-100"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 p-2.5 bg-gray-50 flex gap-2">
                          <input
                            type="text"
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            placeholder="Add new type..."
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={addPackageType}
                            className="bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={roomDropdownRef}>
                    <label className={labelClass}>Room Base</label>
                    <div
                      onClick={() => {
                        if (formData.packageType?.toLowerCase() === "room package") {
                          setIsRoomDropdownOpen(!isRoomDropdownOpen);
                        }
                      }}
                      className={`${inputClass} flex justify-between items-center select-none 
${formData.packageType?.toLowerCase() !== "room package" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
${!formData.roomType && "text-gray-400"}`}
                    >
                      {formData.packageType?.toLowerCase() !== "room package"
                        ? "Not required"
                        : formData.roomType
                          ? roomTypes.find((rt) => String(rt._id) === String(formData.roomType))?.name
                          : "Select Room"}
                      {formData.packageType?.toLowerCase() === "room package" && (
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isRoomDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>

                    {isRoomDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 flex flex-col overflow-hidden">
                        <div className="overflow-y-auto py-2">
                          {roomTypes.map((rt) => (
                            <div
                              key={rt._id}
                              onClick={() => {
                                setFormData({ ...formData, roomType: String(rt._id) });
                                setIsRoomDropdownOpen(false);
                              }}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 transition-colors"
                            >
                              {rt.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Price Base (₱)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400 font-medium">₱</span>
                    <input
                      type="number"
                      name="price"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`${inputClass} pl-8`}
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-3">
                  <label className={labelClass}>Included Amenities</label>
                  <div className="flex gap-2 mb-1.5">
                    <input
                      type="text"
                      value={amenityInput}
                      onChange={(e) => setAmenityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAmenity();
                        }
                      }}
                      placeholder="Type an amenity and press Enter..."
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddAmenity}
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {formData.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100/50 text-blue-800 border border-blue-200/50"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => handleRemoveAmenity(amenity)}
                          className="text-blue-400 hover:text-red-500 font-bold ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 relative z-10">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="package-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
              >
                {editingId ? "Save Changes" : "Create Package"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-gray-100 text-center animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-1">
              Delete {confirmDelete.type === 'package' ? 'Package' : 'Category'}?
            </h3>
            <p className="text-[10px] text-gray-500 mb-6">This action is permanent and cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete({ show: false, id: null, type: "" })}
                className="flex-1 px-4 py-2 text-[10px] font-bold text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithDelete}
                className="flex-1 px-4 py-2 text-[10px] font-bold text-white bg-red-500 rounded-lg shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST FEEDBACK */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-white border-gray-100 animate-in slide-in-from-right duration-300">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs font-bold text-gray-700 tracking-tight">{toast.message}</span>
          <button
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-2 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};

export default Packages;