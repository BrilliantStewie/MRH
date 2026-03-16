import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { StaffContext } from "../../context/StaffContext";
import {
  Search,
  User,
  Users as UsersIcon,
  Mail,
  CircleDot,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCcw,
  Phone
} from "lucide-react";

const CustomDropdown = ({ label, options, value, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || label;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-bold transition-all ${
          isOpen
            ? "bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
      >
        {Icon && <Icon size={14} className={value !== "all" ? "text-indigo-500" : "text-slate-400"} />}
        <span>
          <span className="text-slate-400 font-medium mr-1 hidden sm:inline">{label}:</span>
          {selectedLabel}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                value === opt.value
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {opt.icon && <opt.icon size={14} className={value === opt.value ? "text-indigo-500" : "text-slate-400"} />}
                {opt.label}
              </div>
              {value === opt.value && <Check size={14} className="text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StaffUsers = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (sToken) fetchUsers();
  }, [sToken, backendUrl]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/staff/users`, {
        headers: { token: sToken }
      });
      if (data.success) {
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  const isGuestRole = (role) => role === "guest" || role === "user";

  const getFullName = (u) => {
    if (u.firstName) {
      const middle = u.middleName ? `${u.middleName} ` : "";
      return `${u.firstName} ${middle}${u.lastName}`.trim();
    }
    return u.name || "Unknown User";
  };

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(allUsers) ? allUsers : [];
    const guests = users.filter((u) => isGuestRole(u.role));

    const filtered = guests.filter((u) => {
      const fullName = getFullName(u).toLowerCase();
      const matchSearch = !search ||
        fullName.includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = !u.disabled;
      if (statusFilter === "disabled") matchStatus = u.disabled;

      return matchSearch && matchStatus;
    });

    return filtered.sort((a, b) => {
      const nameA = getFullName(a).toLowerCase();
      const nameB = getFullName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [allUsers, search, statusFilter]);

  const displayedUsers = expanded ? filteredUsers : filteredUsers.slice(0, 5);
  const hiddenCount = filteredUsers.length - 5;

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active", icon: CircleDot },
    { value: "disabled", label: "Disabled", icon: XCircle }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <UsersIcon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users</h1>
            <p className="text-slate-500 text-sm font-medium">Guest accounts only. Viewing is restricted.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
          >
            <RefreshCcw size={16} />
            <span className="text-sm font-semibold sm:inline hidden">Refresh</span>
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            View only
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end z-10">
            <CustomDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} icon={CircleDot} />
            {(statusFilter !== "all" || search) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-full transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Info</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500 font-medium">Loading users...</td>
              </tr>
            ) : displayedUsers.length > 0 ? (
              displayedUsers.map((u) => {
                const imageSrc = u.image
                  ? (u.image.startsWith("http") ? u.image : `${backendUrl}/${u.image.replace(/\\/g, "/")}`)
                  : "";

                return (
                  <tr key={u._id} className={`group transition-colors ${u.disabled ? "bg-slate-50/80" : "hover:bg-slate-50/60"}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 relative ${u.disabled ? "grayscale opacity-70" : ""}`}>
                          {imageSrc ? (
                            <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400"><User size={16} /></div>
                          )}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${u.disabled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                            {getFullName(u)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className={`flex items-center gap-2 text-sm ${u.disabled ? "text-slate-400" : "text-slate-500"}`}>
                          <Mail size={14} className="text-slate-400 opacity-70" />
                          <span className="truncate max-w-[200px]">
                            {u.email || <span className="italic text-slate-300">No Email</span>}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${u.disabled ? "text-slate-400" : "text-slate-500"}`}>
                          <Phone size={14} className="text-slate-400 opacity-70" />
                          <span className="truncate max-w-[200px]">
                            {u.phone || <span className="italic text-slate-300">No Phone</span>}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-slate-100 text-slate-600 border-slate-200">
                        Guest
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {u.disabled ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <XCircle size={12} /> Disabled
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold uppercase tracking-wider">
                          <CircleDot size={12} className="animate-pulse" /> Active
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold text-slate-400 bg-slate-50">
                        View only
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500 font-medium">No users found match your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredUsers.length > 5 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-all active:scale-95"
            >
              {expanded ? (
                <>Show Less <ChevronUp size={16} /></>
              ) : (
                <>Show More ({hiddenCount}) <ChevronDown size={16} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffUsers;
