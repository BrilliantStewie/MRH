import React, { useContext, useEffect, useState, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import { toast } from "react-toastify";

const PACKAGES_PER_PAGE = 8;

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
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, type: "" });
  const [deleteContext, setDeleteContext] = useState(null);
  const [editTypeDialog, setEditTypeDialog] = useState({
    show: false,
    index: null,
    originalType: "",
    value: "",
  });

  // Dropdown States
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);

  const [amenityInput, setAmenityInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAmenities, setExpandedAmenities] = useState({});

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
    setEditTypeDialog({
      show: true,
      index,
      originalType: oldType,
      value: oldType,
    });
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
      toast.error("Please select a package type.");
      return;
    }
    const isRoomPackage =
      formData.packageType?.toLowerCase() === "room package";

    if (isRoomPackage && !formData.roomType) {
      toast.error("Please select a room base for room packages.");
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
      toast.success(editingId ? "Package updated successfully" : "Package created successfully");
    }
  };

  const handleDeleteTrigger = (id) => {
    setConfirmDelete({ show: true, id, type: "package" });
  };

  const closeEditTypeDialog = () => {
    setEditTypeDialog({
      show: false,
      index: null,
      originalType: "",
      value: "",
    });
  };

  const proceedWithTypeEdit = () => {
    const editedType = editTypeDialog.value.trim();

    if (!editedType) {
      toast.error("Category name is required");
      return;
    }

    if (editedType === editTypeDialog.originalType) {
      closeEditTypeDialog();
      return;
    }

    if (packageTypes.includes(editedType)) {
      toast.error("Category already exists");
      return;
    }

    const updatedTypes = [...packageTypes];
    updatedTypes[editTypeDialog.index] = editedType;
    setPackageTypes(updatedTypes);

    if (formData.packageType === editTypeDialog.originalType) {
      setFormData((prev) => ({ ...prev, packageType: editedType }));
    }

    if (filterPackageType === editTypeDialog.originalType) {
      setFilterPackageType(editedType);
    }

    toast.success("Category updated");
    closeEditTypeDialog();
  };

  const proceedWithDelete = async () => {
    if (confirmDelete.type === "package") {
      const success = await deletePackage(confirmDelete.id);
      if (success) toast.success("Package deleted successfully");
    } else if (confirmDelete.type === "type") {
      const { index, typeToDelete } = deleteContext;
      const updatedTypes = packageTypes.filter((_, i) => i !== index);
      setPackageTypes(updatedTypes);
      if (formData.packageType === typeToDelete) {
        setFormData({ ...formData, packageType: "" });
      }
      toast.success("Category removed");
    }
    setConfirmDelete({ show: false, id: null, type: "" });
    setDeleteContext(null);
  };

  /* =========================================
  FILTER DATA
  ========================================= */
  const filteredPackages = allPackages.filter((pkg) => {
  const searchLower = searchTerm.toLowerCase();
  const normalizedPackageFilter = filterPackageType.toLowerCase();
  const shouldApplyRoomTypeFilter = normalizedPackageFilter === "room package";
  
  // Existing Search Filter
  const matchesSearch = 
    (pkg.name || "").toLowerCase().includes(searchLower) ||
    (pkg.packageType || "").toLowerCase().includes(searchLower);

  // Package Type Filter
  const matchesPkgType = filterPackageType === "All" || pkg.packageType === filterPackageType;

  // Room Type Filter (handle object/ID comparison)
  const pkgRoomId = String(pkg.roomType?._id || pkg.roomType || "");
  const matchesRoomType =
    !shouldApplyRoomTypeFilter || filterRoomType === "All" || pkgRoomId === filterRoomType;

  return matchesSearch && matchesPkgType && matchesRoomType;
});

  const showRoomTypeFilter = filterPackageType.toLowerCase() === "room package";

  useEffect(() => {
    if (!showRoomTypeFilter) {
      setFilterRoomType("All");
      setIsRoomFilterOpen(false);
    }
  }, [showRoomTypeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPackageType, filterRoomType]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PACKAGES_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const visiblePageCount = Math.min(4, totalPages);
  const halfVisiblePageCount = Math.floor(visiblePageCount / 2);
  let visiblePageStart = Math.max(1, currentPageSafe - halfVisiblePageCount);
  let visiblePageEnd = visiblePageStart + visiblePageCount - 1;

  if (visiblePageEnd > totalPages) {
    visiblePageEnd = totalPages;
    visiblePageStart = Math.max(1, visiblePageEnd - visiblePageCount + 1);
  }

  const visiblePageNumbers = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, index) => visiblePageStart + index
  );
  const paginatedPackages = filteredPackages.slice(
    (currentPageSafe - 1) * PACKAGES_PER_PAGE,
    currentPageSafe * PACKAGES_PER_PAGE
  );
  const visiblePackageStart =
    filteredPackages.length === 0 ? 0 : (currentPageSafe - 1) * PACKAGES_PER_PAGE + 1;
  const visiblePackageEnd = Math.min(
    currentPageSafe * PACKAGES_PER_PAGE,
    filteredPackages.length
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleAmenitiesExpansion = (packageId) => {
    setExpandedAmenities((prev) => ({
      ...prev,
      [packageId]: !prev[packageId],
    }));
  };

  /* =========================================
  UI CLASSES
  ========================================= */
  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 transition-all placeholder:text-gray-400 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50";
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500";

  return (
    <div className="flex flex-col bg-slate-50 font-sans text-slate-900">
      <div className="flex flex-1 flex-col">

      {/* HEADER SECTION */}
<div className="mb-4 flex flex-col gap-3">
  {/* Title Row */}
  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Packages
      </h1>
      <p className="mt-1 text-xs text-slate-500">
        Design and manage your service offerings, room inclusions, and custom venue bundles.
      </p>
    </div>

    <div className="flex w-full flex-col items-end md:w-auto">
      <button
        onClick={handleOpenAddModal}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-black"
      >
        + Add Package
      </button>
    </div>
  </div>

 <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between">

  {/* SEARCH */}
<div className="w-full rounded-xl border border-slate-200 bg-white px-4 shadow-sm lg:flex lg:h-[46px] lg:max-w-[294px] lg:items-center">
  <input
    type="text"
    placeholder="Search packages..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full bg-transparent py-2.5 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
  />
</div>

  <div className="flex flex-wrap items-center gap-3 lg:ml-auto lg:justify-end">

  {/* PACKAGE TYPE FILTER */}
<div ref={packageFilterRef} className="relative">
  <button
    onClick={() => setIsPackageFilterOpen(!isPackageFilterOpen)}
    className="flex h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
  >
    {filterPackageType === "All" ? "Package Types" : filterPackageType}
    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </button>

  {isPackageFilterOpen && (
    <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl animate-in fade-in zoom-in-95 duration-200">
      <div
        onClick={() => {
          setFilterPackageType("All");
          setIsPackageFilterOpen(false);
        }}
        className="flex items-center gap-3 rounded-lg px-4 py-3 text-xs font-bold text-slate-400 cursor-pointer hover:bg-slate-100"
      >
        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        All Package Types
      </div>

      <div className="mx-1 my-1.5 h-px bg-slate-100" />

      {packageTypes.map(t => (
        <div
          key={t}
          onClick={() => {
            setFilterPackageType(t);
            setIsPackageFilterOpen(false);
          }}
          className="cursor-pointer rounded-lg px-4 py-3.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {t}
        </div>
      ))}
    </div>
  )}
</div>


  {/* ROOM FILTER */}
  {showRoomTypeFilter && (
  <div ref={roomFilterRef} className="relative">
    <button
      onClick={() => setIsRoomFilterOpen(!isRoomFilterOpen)}
      className="flex h-[46px] min-w-[190px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
    >
      <span className="truncate">
        {filterRoomType === "All"
          ? "Room Types"
          : roomTypes.find((r) => String(r._id) === String(filterRoomType))?.name}
      </span>

      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    {isRoomFilterOpen && (
      <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl animate-in fade-in zoom-in-95 duration-200">

        <div
          onClick={() => {
            setFilterRoomType("All");
            setIsRoomFilterOpen(false);
          }}
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-xs font-bold text-slate-400 cursor-pointer hover:bg-slate-100"
        >
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M5 19h14a1 1 0 001-1V8a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1z" />
          </svg>
          All Room Types
        </div>

        <div className="mx-1 my-1.5 h-px bg-slate-100" />

        {roomTypes.map(rt => (
          <div
            key={rt._id}
            onClick={() => {
              setFilterRoomType(rt._id);
              setIsRoomFilterOpen(false);
            }}
            className="cursor-pointer rounded-lg px-4 py-3.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            {rt.name}
          </div>
        ))}

      </div>
    )}
  </div>
  )}


  {/* RESET */}
  <button
    onClick={() => {
      setSearchTerm("");
      setFilterPackageType("All");
      setFilterRoomType("All");
    }}
    type="button"
    title="Reset filters"
    aria-label="Reset filters"
    className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-red-500"
  >
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 20v-5h-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.6 13.2A7 7 0 0017 17.4L20 15" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.4 10.8A7 7 0 007 6.6L4 9" />
    </svg>
  </button>

</div>

</div>
</div>

      {/* COMPACT CARDS GRID */}
      {filteredPackages.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
            <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-lg font-semibold text-slate-500">No packages found</p>
          <p className="text-sm text-slate-400">Try adjusting your search or create a new one.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {paginatedPackages.map((pkg) => {
            const roomId = pkg.roomType?._id || pkg.roomType;
            const localRoomTypeMatch = roomTypes.find((rt) => String(rt._id) === String(roomId));
            const roomName = localRoomTypeMatch ? localRoomTypeMatch.name : (pkg.roomType?.name || "No rooms added");
            const pkgAmenities = Array.isArray(pkg.amenities) ? pkg.amenities : [];
            const amenitiesExpanded = Boolean(expandedAmenities[pkg._id]);
            const visibleAmenities = amenitiesExpanded ? pkgAmenities : pkgAmenities.slice(0, 2);

            const theme = {
              cardBg: "bg-white",
              headerBg: "bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100/90",
              borderColor: "border-slate-200",
              hoverBorder: "hover:border-slate-300",
              titleColor: "text-slate-900",
              priceColor: "text-slate-900",
              badge: "border-slate-200 bg-white text-slate-700",
              subText: "text-slate-500",
              divider: "border-gray-100",
              amenity: "border-gray-100 bg-gray-50 text-gray-600",
            };

            return (
              <div
                key={pkg._id}
                className={`group relative flex min-h-[218px] flex-col overflow-hidden rounded-lg border shadow-sm transition-all duration-200 ${theme.cardBg} ${theme.borderColor} ${theme.hoverBorder}`}
              >
                <div className={`relative border-b p-2 ${theme.headerBg} ${theme.borderColor}`}>
                  <div className="absolute right-2.5 top-2.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenEditModal(pkg)}
                      className="rounded-md border border-gray-200 bg-white/90 p-1 text-gray-500 shadow-sm hover:text-blue-600"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrigger(pkg._id);
                      }}
                      className="rounded-md border border-gray-200 bg-white/90 p-1 text-gray-500 shadow-sm hover:text-red-600"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <div className="mb-1 pr-7">
                    <h3 className={`text-[17px] font-bold leading-tight ${theme.titleColor} line-clamp-1`}>
                      {pkg.name}
                    </h3>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] ${theme.badge}`}>
                        {pkg.packageType}
                      </span>

                      <div className="flex items-baseline justify-end">
                        <span className={`mr-1 text-[9px] font-bold ${theme.priceColor} opacity-60`}>₱</span>
                        <span className={`text-[15px] font-black tracking-tight ${theme.priceColor}`}>
                          {Number(pkg.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className={`truncate text-[10px] ${roomName !== "No room selected" ? "font-bold text-gray-600" : "italic text-gray-400"}`}>
                      {roomName}
                    </span>
                  </div>

                  <div className="mb-1.5 flex-grow rounded-lg border border-gray-100 bg-gray-50/70 px-2 py-1.5">
                    <p className={`text-[9px] leading-relaxed ${theme.subText} line-clamp-2`}>
                      {pkg.description || "No additional details provided."}
                    </p>
                  </div>

                  <div className="flex min-h-[28px] flex-wrap content-start gap-1">
                    {visibleAmenities.map((am, i) => (
                      <div key={i} className={`flex items-center gap-1 rounded border px-1.5 py-0.5 ${theme.amenity}`}>
                        <span className="text-[8px] font-bold uppercase tracking-tight">{am}</span>
                      </div>
                    ))}
                    {pkgAmenities.length > 2 && (
                      <button
                        type="button"
                        onClick={() => toggleAmenitiesExpansion(pkg._id)}
                        className="px-1 pt-0.5 text-[8px] font-bold text-gray-400 transition-colors hover:text-gray-700"
                      >
                        {amenitiesExpanded ? "SHOW LESS" : `+${pkgAmenities.length - 2} MORE`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          <div className="mt-4">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-gray-400">
                  Package Directory
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-700 sm:text-xs">
                  Showing {visiblePackageStart}-{visiblePackageEnd} of {filteredPackages.length} packages
                </p>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPageSafe === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {visiblePageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-8 rounded-md px-2.5 py-1.5 text-[9px] font-bold transition ${
                        currentPageSafe === page
                          ? "bg-black text-white shadow-sm"
                          : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPageSafe === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
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

            <div className="max-h-[65vh] overflow-y-auto bg-white p-6">
              <form id="package-form" onSubmit={handleSubmit} className="space-y-4">

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                  <div>
                    <label className={labelClass}>Price Base (₱)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-sm font-medium text-gray-400">₱</span>
                      <input
                        type="number"
                        name="price"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="0.00"
                        className={`${inputClass} pl-14`}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                  <div className="relative" ref={dropdownRef}>
                    <label className={labelClass}>Package Type</label>
                    <div
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className={`${inputClass} flex cursor-pointer items-center justify-between select-none ${!formData.packageType && "text-gray-400"}`}
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
                      className={`${inputClass} flex items-center justify-between select-none 
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

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="5"
                      className={`${inputClass} min-h-[132px] resize-none py-3`}
                    />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                    <label className={labelClass}>Included Amenities</label>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={amenityInput}
                        onChange={(e) => setAmenityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAmenity();
                          }
                        }}
                        placeholder="Type an amenity and press Enter..."
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddAmenity}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex min-h-[132px] flex-wrap content-start gap-1.5 rounded-lg border border-dashed border-gray-200 bg-white/70 p-2.5">
                      {formData.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200/50 bg-blue-100/50 px-2.5 py-1 text-xs font-semibold text-blue-800"
                        >
                          {amenity}
                          <button
                            type="button"
                            onClick={() => handleRemoveAmenity(amenity)}
                            className="ml-0.5 font-bold text-blue-400 hover:text-red-500"
                          >
                            x
                          </button>
                        </span>
                      ))}
                      {formData.amenities.length === 0 && (
                        <span className="text-xs font-medium text-gray-400">
                          No amenities added yet.
                        </span>
                      )}
                    </div>
                  </div>
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

      {editTypeDialog.show && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]">
            <div className="px-6 py-6">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                    Edit Category
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                    Rename package type
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Update the category label used for package organization.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-blue-500">
                  Category Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={editTypeDialog.value}
                  onChange={(e) =>
                    setEditTypeDialog((prev) => ({
                      ...prev,
                      value: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      proceedWithTypeEdit();
                    }
                  }}
                  className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeEditTypeDialog}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-all hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedWithTypeEdit}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST FEEDBACK */}
      {false && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-white border-gray-100 animate-in slide-in-from-right duration-300">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs font-bold text-gray-700 tracking-tight">{toast.message}</span>
          <button
            onClick={() => {}}
            className="ml-2 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      </div>
    </div>
  );
};

export default Packages;
