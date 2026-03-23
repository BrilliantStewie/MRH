import React, { useContext, useEffect, useRef, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { toast } from "react-toastify";
import {
  BedSingle,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import FilterDropdown from "../../components/Admin/FilterDropdown";

const PACKAGES_PER_PAGE = 8;
const DEFAULT_PACKAGE_TYPES = ["Room Package", "Venue Package", "Amenity"];
const isRoomPackageType = (value) =>
  String(value || "").toLowerCase() === "room package";

const Packages = () => {
  const {
    allPackages = [],
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,
    roomTypes = [],
    getRoomTypes,
  } = useContext(AdminContext);

  const initialFormState = {
    name: "",
    packageType: "",
    roomType: "",
    price: "",
    description: "",
    amenities: [],
  };

  const [filterPackageType, setFilterPackageType] = useState("All");
  const [filterRoomType, setFilterRoomType] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, type: "" });
  const [deleteContext, setDeleteContext] = useState(null);
  const [editTypeDialog, setEditTypeDialog] = useState({
    show: false,
    index: null,
    originalType: "",
    value: "",
  });
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAmenities, setExpandedAmenities] = useState({});
  const [packageTypes, setPackageTypes] = useState(DEFAULT_PACKAGE_TYPES);
  const [newType, setNewType] = useState("");
  const [formData, setFormData] = useState(initialFormState);

  const dropdownRef = useRef(null);
  const roomDropdownRef = useRef(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateSelectedPackageType = (value) => {
    const nextType = String(value || "");
    const roomPackageSelected = isRoomPackageType(nextType);
    setFormData((prev) => ({
      ...prev,
      packageType: nextType,
      roomType: roomPackageSelected ? prev.roomType : "",
    }));
    setIsTypeDropdownOpen(false);
    if (!roomPackageSelected) setIsRoomDropdownOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "packageType") {
      updateSelectedPackageType(value);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setAmenityInput("");
    setNewType("");
    setIsTypeDropdownOpen(false);
    setIsRoomDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg) => {
    const safeRoomId = isRoomPackageType(pkg.packageType)
      ? pkg.roomType?._id || pkg.roomType || ""
      : "";
    setEditingId(pkg._id);
    setFormData({
      name: pkg.name || "",
      packageType: pkg.packageType || "",
      roomType: safeRoomId,
      price: pkg.price || "",
      description: pkg.description || "",
      amenities: Array.isArray(pkg.amenities) ? pkg.amenities : [],
    });
    setPackageTypes((prev) =>
      !pkg.packageType || prev.includes(pkg.packageType) ? prev : [...prev, pkg.packageType]
    );
    setAmenityInput("");
    setNewType("");
    setIsTypeDropdownOpen(false);
    setIsRoomDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setAmenityInput("");
    setNewType("");
    setIsTypeDropdownOpen(false);
    setIsRoomDropdownOpen(false);
  };

  const handleAddAmenity = (e) => {
    e?.preventDefault();
    const trimmedAmenity = amenityInput.trim();
    if (!trimmedAmenity) return;
    const normalizedAmenity = trimmedAmenity.toUpperCase();
    if (formData.amenities.includes(normalizedAmenity)) {
      setAmenityInput("");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      amenities: [...prev.amenities, normalizedAmenity],
    }));
    setAmenityInput("");
  };

  const handleRemoveAmenity = (amenityToRemove) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((amenity) => amenity !== amenityToRemove),
    }));
  };

  const addPackageType = (e) => {
    e?.preventDefault();
    const trimmedType = newType.trim();
    if (!trimmedType) return;
    const existingType = packageTypes.find(
      (type) => type.toLowerCase() === trimmedType.toLowerCase()
    );
    if (existingType) {
      updateSelectedPackageType(existingType);
      setNewType("");
      return;
    }
    setPackageTypes((prev) => [...prev, trimmedType]);
    updateSelectedPackageType(trimmedType);
    setNewType("");
  };

  const handleEditPackageType = (index, oldType, e) => {
    e.stopPropagation();
    setEditTypeDialog({ show: true, index, originalType: oldType, value: oldType });
  };

  const handleDeletePackageType = (index, typeToDelete, e) => {
    e.stopPropagation();
    setDeleteContext({ index, typeToDelete });
    setConfirmDelete({ show: true, id: null, type: "type" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.packageType) {
      toast.error("Please select a package type.");
      return;
    }
    if (isRoomPackageType(formData.packageType) && !formData.roomType) {
      toast.error("Please select a room base for room packages.");
      return;
    }
    const payload = {
      ...formData,
      roomType: isRoomPackageType(formData.packageType) ? formData.roomType : null,
    };
    const success = editingId
      ? await updatePackage(editingId, payload)
      : await addPackage(payload);
    if (success) handleCloseModal();
  };

  const closeEditTypeDialog = () => {
    setEditTypeDialog({ show: false, index: null, originalType: "", value: "" });
  };

  const proceedWithTypeEdit = () => {
    const editedType = editTypeDialog.value.trim();
    if (!editedType) {
      toast.error("Category name is required");
      return;
    }
    const duplicateType = packageTypes.some(
      (type, index) =>
        index !== editTypeDialog.index &&
        type.toLowerCase() === editedType.toLowerCase()
    );
    if (duplicateType) {
      toast.error("Category already exists");
      return;
    }
    const updatedTypes = [...packageTypes];
    updatedTypes[editTypeDialog.index] = editedType;
    setPackageTypes(updatedTypes);
    if (formData.packageType === editTypeDialog.originalType) {
      setFormData((prev) => ({
        ...prev,
        packageType: editedType,
        roomType: isRoomPackageType(editedType) ? prev.roomType : "",
      }));
    }
    if (filterPackageType === editTypeDialog.originalType) {
      setFilterPackageType(editedType);
    }
    toast.success("Category updated");
    closeEditTypeDialog();
  };

  const proceedWithDelete = async () => {
    if (confirmDelete.type === "package") {
      await deletePackage(confirmDelete.id);
    } else if (confirmDelete.type === "type") {
      const { index, typeToDelete } = deleteContext;
      setPackageTypes((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
      if (formData.packageType === typeToDelete) {
        setFormData((prev) => ({ ...prev, packageType: "", roomType: "" }));
      }
      if (filterPackageType === typeToDelete) {
        setFilterPackageType("All");
      }
      toast.success("Category removed");
    }
    setConfirmDelete({ show: false, id: null, type: "" });
    setDeleteContext(null);
  };

  const filteredPackages = allPackages.filter((pkg) => {
    const searchLower = searchTerm.toLowerCase();
    const shouldApplyRoomTypeFilter = filterPackageType.toLowerCase() === "room package";
    const matchesSearch =
      (pkg.name || "").toLowerCase().includes(searchLower) ||
      (pkg.packageType || "").toLowerCase().includes(searchLower);
    const matchesPkgType =
      filterPackageType === "All" || pkg.packageType === filterPackageType;
    const pkgRoomId = String(pkg.roomType?._id || pkg.roomType || "");
    const matchesRoomType =
      !shouldApplyRoomTypeFilter ||
      filterRoomType === "All" ||
      pkgRoomId === filterRoomType;
    return matchesSearch && matchesPkgType && matchesRoomType;
  });

  const showRoomTypeFilter = filterPackageType.toLowerCase() === "room package";
  useEffect(() => {
    if (!showRoomTypeFilter) setFilterRoomType("All");
  }, [showRoomTypeFilter]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPackageType, filterRoomType]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PACKAGES_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const visiblePageCount = Math.min(3, totalPages);
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
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toggleAmenitiesExpansion = (packageId) => {
    setExpandedAmenities((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-50";
  const labelClass =
    "mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-slate-400";
  const panelClass =
    "space-y-4";
  const getPackageTypeIcon = (type) => {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "room package") return BedSingle;
    if (normalized === "venue package") return Building2;
    return Package;
  };

  const packageFilterOptions = [
    { value: "All", label: "All Package Types", icon: Package },
    ...packageTypes.map((type) => ({
      value: type,
      label: type,
      icon: getPackageTypeIcon(type),
    })),
  ];
  const roomTypeFilterOptions = [
    { value: "All", label: "All Room Types", icon: BedSingle },
    ...roomTypes.map((roomType) => ({
      value: roomType._id,
      label: roomType.name,
      icon: BedSingle,
    })),
  ];

  const isRoomPackageSelected = isRoomPackageType(formData.packageType);
  const selectedRoomType =
    roomTypes.find((roomType) => String(roomType._id) === String(formData.roomType)) ||
    null;
  const SelectedPackageTypeIcon = getPackageTypeIcon(formData.packageType);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 font-sans text-slate-900">
      <div className="-mt-4 flex min-h-0 flex-1 flex-col lg:-mt-5">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Packages
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Design and manage your service offerings, room inclusions, and
                custom venue bundles.
              </p>
            </div>

            <div className="flex w-full flex-col items-end md:w-auto">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-black"
              >
                <Plus size={18} />
                <span>Add Package</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="inline-flex h-11 w-[260px] max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:ml-auto lg:justify-end">
              <FilterDropdown
                label="Package Type"
                options={packageFilterOptions}
                value={filterPackageType}
                onChange={setFilterPackageType}
                icon={Package}
                neutralValue="All"
                align="left"
                triggerClassName="min-w-[192px] justify-between bg-slate-50 font-bold"
                menuClassName="w-60"
              />

              {showRoomTypeFilter && (
                <FilterDropdown
                  label="Room Type"
                  options={roomTypeFilterOptions}
                  value={filterRoomType}
                  onChange={setFilterRoomType}
                  icon={BedSingle}
                  neutralValue="All"
                  align="left"
                  triggerClassName="min-w-[198px] justify-between bg-slate-50 font-bold"
                  menuClassName="w-64"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterPackageType("All");
                  setFilterRoomType("All");
                }}
                title="Reset filters"
                aria-label="Reset filters"
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-rose-500"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {filteredPackages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-500">
                No packages found
              </p>
              <p className="text-sm text-slate-400">
                Try adjusting your search or create a new one.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {paginatedPackages.map((pkg) => {
                  const roomId = pkg.roomType?._id || pkg.roomType;
                  const localRoomTypeMatch = roomTypes.find(
                    (roomType) => String(roomType._id) === String(roomId)
                  );
                  const roomName = localRoomTypeMatch
                    ? localRoomTypeMatch.name
                    : pkg.roomType?.name || "No room assigned";
                  const pkgAmenities = Array.isArray(pkg.amenities)
                    ? pkg.amenities
                    : [];
                  const amenitiesExpanded = Boolean(expandedAmenities[pkg._id]);
                  const visibleAmenities = amenitiesExpanded
                    ? pkgAmenities
                    : pkgAmenities.slice(0, 2);

                  return (
                    <div
                      key={pkg._id}
                      className="group relative flex h-full min-h-[212px] w-full max-w-[356px] justify-self-center flex-col overflow-hidden rounded-[1.55rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-xl"
                    >
                      <div className="relative border-b border-slate-200 bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100/90 p-2.5">
                        <div className="absolute right-2.5 top-2.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(pkg)}
                            className="rounded-md border border-slate-200 bg-white/90 p-0.5 text-slate-500 shadow-sm hover:text-blue-600"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrigger(pkg._id)}
                            className="rounded-md border border-slate-200 bg-white/90 p-0.5 text-slate-500 shadow-sm hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="mb-1.5">
                          <h3 className="line-clamp-1 pr-10 text-[15px] font-bold leading-tight text-slate-900">
                            {pkg.name}
                          </h3>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-slate-700">
                              {pkg.packageType}
                            </span>
                            <div className="ml-auto flex items-baseline justify-end gap-1 text-right">
                              <span className="text-[8px] font-bold uppercase text-slate-500">
                                ₱
                              </span>
                              <span className="text-[14px] font-black tracking-tight text-slate-900">
                                {Number(pkg.price || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-grow flex-col p-2.5">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <BedSingle className="h-2.5 w-2.5 text-slate-400" />
                          <span
                            className={`truncate text-[9px] ${
                              roomName !== "No room assigned"
                                ? "font-bold text-slate-600"
                                : "italic text-slate-400"
                            }`}
                          >
                            {roomName}
                          </span>
                        </div>

                        <div className="mb-1.5 min-h-[56px] rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-1.5">
                          <p className="line-clamp-2 text-[10px] leading-snug text-slate-500">
                            {pkg.description ||
                              "No additional details provided."}
                          </p>
                        </div>

                        <div className="mt-1.5 flex min-h-[16px] flex-wrap content-start gap-0.5">
                          {visibleAmenities.map((amenity, index) => (
                            <div
                              key={`${amenity}-${index}`}
                              className="flex items-center gap-0.5 rounded border border-slate-100 bg-slate-50 px-1 py-0.5 text-slate-600"
                            >
                              <span className="text-[7px] font-bold uppercase tracking-tight">
                                {amenity}
                              </span>
                            </div>
                          ))}
                          {pkgAmenities.length > 2 && (
                            <button
                              type="button"
                              onClick={() => toggleAmenitiesExpansion(pkg._id)}
                              className="px-0.5 pt-0.5 text-[7px] font-bold text-slate-400 transition-colors hover:text-slate-700"
                            >
                              {amenitiesExpanded
                                ? "SHOW LESS"
                                : `+${pkgAmenities.length - 2} MORE`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-auto pt-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full text-left sm:w-auto">
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
                  Package Directory
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
                  Showing {visiblePackageStart}-{visiblePackageEnd} of{" "}
                  {filteredPackages.length} packages
                </p>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPageSafe === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {visiblePageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[9px] font-bold transition ${
                          currentPageSafe === page
                            ? "bg-slate-900 text-white shadow-md"
                            : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPageSafe === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-2 md:p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl">
            <form
              id="package-form"
              onSubmit={handleSubmit}
              className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 md:px-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    {editingId ? <Edit3 size={18} /> : <Package size={18} />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {editingId ? "Update Package" : "Create Package"}
                    </p>
                    <h2 className="text-xl font-black tracking-tight text-slate-800 md:text-2xl">
                      {editingId ? "Update Package" : "Add New Package"}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-white">
                <div className="space-y-5 p-6 md:p-7">
                  <div className="space-y-5">
                  <div className={panelClass}>
                    <div className="grid gap-3 md:grid-cols-2">
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
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            ₱
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className={`${inputClass} pl-14`}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className={panelClass}>
                    <div ref={dropdownRef} className="relative">
                      <label className={labelClass}>Package Type</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTypeDropdownOpen((open) => !open);
                          setIsRoomDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-all ${
                          isTypeDropdownOpen
                            ? "border-blue-500 bg-white ring-4 ring-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                            <SelectedPackageTypeIcon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-800">
                              {formData.packageType || "Select package type"}
                            </span>
                            <span className="block text-xs text-slate-400">
                              Use an existing category or create a new one.
                            </span>
                          </span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-slate-400 transition-transform ${
                            isTypeDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isTypeDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-2xl overflow-hidden">
                          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                            {packageTypes.map((type, index) => {
                              const selected = formData.packageType === type;
                              const TypeIcon = getPackageTypeIcon(type);

                              return (
                                <div
                                  key={`${type}-${index}`}
                                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                                    selected
                                      ? "border-slate-200 bg-slate-50"
                                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateSelectedPackageType(type)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                  >
                                    <span
                                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                        selected
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      <TypeIcon size={16} />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-semibold text-slate-800">
                                        {type}
                                      </span>
                                      <span className="block text-[11px] font-medium text-slate-400">
                                        {selected
                                          ? "Selected for this package"
                                          : "Click to use this category"}
                                      </span>
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleEditPackageType(index, type, e)
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-blue-600"
                                  >
                                    <Edit3 size={14} />
                                  </button>

                                  {packageTypes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDeletePackageType(index, type, e)
                                      }
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-600"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Add category
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addPackageType();
                                  }
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
                                placeholder="e.g., Function Hall Bundle"
                              />
                              <button
                                type="button"
                                onClick={addPackageType}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={panelClass}>
                    <div ref={roomDropdownRef} className="relative">
                      <label className={labelClass}>Room Base</label>
                      <button
                        type="button"
                        disabled={!isRoomPackageSelected}
                        onClick={() => {
                          if (!isRoomPackageSelected) return;
                          setIsRoomDropdownOpen((open) => !open);
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-all ${
                          !isRoomPackageSelected
                            ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                            : isRoomDropdownOpen
                            ? "border-blue-500 bg-white ring-4 ring-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                isRoomPackageSelected
                                  ? "bg-blue-50 text-blue-500"
                                  : "bg-white text-slate-300"
                              }`}
                            >
                              <BedSingle size={15} />
                          </span>
                            <span className="min-w-0">
                              <span
                                className={`block truncate text-xs font-semibold ${
                                  isRoomPackageSelected
                                    ? "text-slate-800"
                                    : "text-slate-400"
                                }`}
                              >
                                {!isRoomPackageSelected
                                  ? "Not required"
                                  : selectedRoomType?.name || "Select room type"}
                              </span>
                            <span className="block text-xs text-slate-400">
                              {isRoomPackageSelected
                                ? "Choose the room type attached to this package."
                                : "Switch to Room Package to enable selection."}
                            </span>
                          </span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 transition-transform ${
                            isRoomDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isRoomDropdownOpen && isRoomPackageSelected && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-2xl overflow-hidden">
                          {roomTypes.length > 0 ? (
                            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                              {roomTypes.map((roomType) => {
                                const selected =
                                  String(roomType._id) === String(formData.roomType);

                                return (
                                  <button
                                    key={roomType._id}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        roomType: roomType._id,
                                      }));
                                      setIsRoomDropdownOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                      selected
                                        ? "border-slate-200 bg-slate-50"
                                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                        selected
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      <BedSingle size={16} />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-semibold text-slate-800">
                                        {roomType.name}
                                      </span>
                                      <span className="block text-[11px] font-medium text-slate-400">
                                        {selected
                                          ? "Selected room base"
                                          : "Use this room type"}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs font-medium text-slate-400">
                              No room types available yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className={`${panelClass} md:col-span-2`}>
                    <label className={labelClass}>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className={`${inputClass} min-h-[88px] resize-none`}
                      placeholder="Describe the package inclusions and overall experience."
                    />
                  </div>

                  <div className={`${panelClass} md:col-span-2`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className={labelClass}>Included Amenities</label>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {formData.amenities.length} selected
                      </span>
                    </div>

                    <div className="mt-2 inline-flex items-center gap-2.5">
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
                        className="w-[156px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-50"
                        placeholder="Amenity"
                      />
                      <button
                        type="button"
                        onClick={handleAddAmenity}
                        className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-2.5 min-h-[52px] rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2">
                      {formData.amenities.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formData.amenities.map((amenity, index) => (
                            <span
                              key={`${amenity}-${index}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-700"
                            >
                              {amenity}
                              <button
                                type="button"
                                onClick={() => handleRemoveAmenity(amenity)}
                                className="rounded-full text-blue-400 transition hover:text-blue-700"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[52px] items-center justify-center text-center text-[11px] font-medium text-slate-400">
                          No amenities added yet.
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-md md:px-7">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 transition-all hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-8 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-blue-300"
                  >
                    {editingId ? "Save Changes" : "Add Package"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mb-1 text-sm font-black text-gray-900">
              Delete {confirmDelete.type === "package" ? "Package" : "Category"}
              ?
            </h3>
            <p className="mb-6 text-[10px] text-gray-500">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmDelete({ show: false, id: null, type: "" })
                }
                className="flex-1 rounded-lg bg-gray-50 px-4 py-2 text-[10px] font-bold text-gray-400 transition-colors hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedWithDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[10px] font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-600"
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
                  <Edit3 className="h-5 w-5" />
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
    </div>
  );
};

export default Packages;
