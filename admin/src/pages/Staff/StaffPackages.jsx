import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { StaffContext } from "../../context/StaffContext";

const StaffPackages = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterPackageType, setFilterPackageType] = useState("All");
  const [filterRoomType, setFilterRoomType] = useState("All");
  const [isPackageFilterOpen, setIsPackageFilterOpen] = useState(false);
  const [isRoomFilterOpen, setIsRoomFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const packageFilterRef = useRef(null);
  const roomFilterRef = useRef(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/staff/packages`, {
          headers: { token: sToken }
        });
        if (data.success) {
          setPackages(data.packages || []);
        }
      } catch (error) {
        console.error("Failed to load packages", error);
      } finally {
        setLoading(false);
      }
    };

    if (sToken) fetchPackages();
  }, [backendUrl, sToken]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (packageFilterRef.current && !packageFilterRef.current.contains(event.target)) {
        setIsPackageFilterOpen(false);
      }
      if (roomFilterRef.current && !roomFilterRef.current.contains(event.target)) {
        setIsRoomFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const packageTypes = useMemo(() => {
    return Array.from(
      new Set((packages || []).map((pkg) => pkg.packageType).filter(Boolean))
    );
  }, [packages]);

  const roomTypes = useMemo(() => {
    const map = new Map();
    (packages || []).forEach((pkg) => {
      const roomType = pkg.roomType;
      if (!roomType) return;

      if (typeof roomType === "object") {
        const id = String(roomType._id || roomType.name || "");
        const name = roomType.name || roomType.roomType || String(roomType._id || "");
        if (id && name) {
          map.set(id, { _id: id, name });
        }
      } else {
        const id = String(roomType);
        map.set(id, { _id: id, name: String(roomType) });
      }
    });
    return Array.from(map.values());
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return (packages || []).filter((pkg) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (pkg.name || "").toLowerCase().includes(searchLower) ||
        (pkg.packageType || "").toLowerCase().includes(searchLower);

      const matchesPkgType = filterPackageType === "All" || pkg.packageType === filterPackageType;
      const pkgRoomId = String(pkg.roomType?._id || pkg.roomType || "");
      const matchesRoomType = filterRoomType === "All" || pkgRoomId === filterRoomType;

      return matchesSearch && matchesPkgType && matchesRoomType;
    });
  }, [packages, filterPackageType, filterRoomType, searchTerm]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans text-gray-900 relative">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Packages
            </h1>
            <p className="text-gray-500 mt-2 text-sm max-w-md">
              Design and manage your service offerings, room inclusions, and custom venue bundles.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            View only
          </div>
        </div>

        <div className="flex items-center justify-between">
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
            <div ref={packageFilterRef} className="relative">
              <button
                onClick={() => setIsPackageFilterOpen(!isPackageFilterOpen)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-100"
              >
                {filterPackageType === "All" ? "All Types" : filterPackageType}
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
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

                  {packageTypes.map((t) => (
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

            <div ref={roomFilterRef} className="relative">
              <button
                onClick={() => setIsRoomFilterOpen(!isRoomFilterOpen)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-100"
              >
                {filterRoomType === "All"
                  ? "All Rooms"
                  : roomTypes.find((r) => r._id === filterRoomType)?.name}

                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
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

                  {roomTypes.map((rt) => (
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

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/60 py-20 flex flex-col items-center justify-center space-y-3 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2 animate-pulse"></div>
          <p className="text-gray-500 font-semibold text-lg">Loading packages...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/60 py-20 flex flex-col items-center justify-center space-y-3 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-gray-500 font-semibold text-lg">No packages found</p>
          <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
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
              badge: "bg-white text-blue-700 border-blue-200"
            };

            if (pType.includes("room")) {
              theme = {
                headerBg: "bg-gradient-to-br from-emerald-50/80 to-teal-50/80",
                borderColor: "border-emerald-100/60",
                hoverBorder: "hover:border-emerald-300",
                titleColor: "text-emerald-950",
                priceColor: "text-emerald-700",
                badge: "bg-white text-emerald-700 border-emerald-200"
              };
            } else if (pType.includes("venue")) {
              theme = {
                headerBg: "bg-gradient-to-br from-gray-50 to-slate-100/80",
                borderColor: "border-slate-200/60",
                hoverBorder: "hover:border-slate-400",
                titleColor: "text-slate-900",
                priceColor: "text-slate-800",
                badge: "bg-white text-slate-700 border-slate-200"
              };
            }

            return (
              <div
                key={pkg._id}
                className={`group relative bg-white rounded-xl border ${theme.borderColor} shadow-sm transition-all duration-200 flex flex-col overflow-hidden ${theme.hoverBorder}`}
              >
                <div className={`p-4 ${theme.headerBg} border-b ${theme.borderColor} relative`}>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border mb-2 ${theme.badge}`}>
                    {pkg.packageType}
                  </span>

                  <h3 className={`text-base font-bold ${theme.titleColor} leading-tight mb-2 pr-8 line-clamp-1`}>
                    {pkg.name}
                  </h3>

                  <div className="flex items-baseline">
                    <span className={`text-xs font-bold ${theme.priceColor} opacity-70 mr-1`}>PHP</span>
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
    </div>
  );
};

export default StaffPackages;
