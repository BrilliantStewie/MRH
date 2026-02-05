import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Search, 
  User, 
  Users as UsersIcon, 
  Mail, 
  Command, 
  Lock, 
  Unlock,
  Filter,
  Shield,
  CircleDot,
  XCircle,
  ChevronDown,
  Check
} from "lucide-react";

// 🎨 INTERNAL COMPONENT: Custom Rounded Dropdown
const CustomDropdown = ({ label, options, value, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-bold transition-all ${
          isOpen 
            ? "bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20" 
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
      >
        {Icon && <Icon size={14} className={value !== 'all' ? "text-indigo-500" : "text-slate-400"} />}
        <span>
          <span className="text-slate-400 font-medium mr-1 hidden sm:inline">{label}:</span>
          {selectedLabel}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Floating Menu */}
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

const Users = () => {
  const { aToken, allUsers, getAllUsers, changeUserStatus } = useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 

  const [adminInfo, setAdminInfo] = useState({ email: "", isYou: false });

  useEffect(() => {
    if (aToken) {
      getAllUsers();
      try {
        const payload = JSON.parse(atob(aToken.split(".")[1]));
        setAdminInfo({ email: payload.email || "", isYou: payload.role === "admin" });
      } catch {
        setAdminInfo({ email: "", isYou: false });
      }
    }
  }, [aToken, getAllUsers]);

  const adminUser = {
    _id: "system-root",
    name: "MRH Admin",
    email: "system@mrh.admin",
    role: "admin",
    image: "", 
    isSystem: true,
    isYou: adminInfo.isYou,
    disabled: false
  };

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(allUsers) ? allUsers : [];
    const merged = [adminUser, ...users.filter((u) => u.email !== adminUser.email)];
    
    return merged.filter((u) => {
      const matchSearch = !search || 
        u.name?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase());

      const matchRole = roleFilter === "all" || u.role === roleFilter;

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = !u.disabled;
      if (statusFilter === "frozen") matchStatus = u.disabled;

      return matchSearch && matchRole && matchStatus;
    });
  }, [allUsers, search, roleFilter, statusFilter, adminUser]);

  // 📝 Options for Dropdowns
  const roleOptions = [
    { value: "all", label: "All" },
    { value: "staff", label: "Staff", icon: User },
    { value: "user", label: "Guest", icon: User },
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active", icon: CircleDot },
    { value: "frozen", label: "Frozen", icon: XCircle },
  ];

  return (
    <div className="lg: min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* 🟢 TOP BAR */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                <UsersIcon className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users</h1>
                <p className="text-slate-500 text-sm font-medium">Manage system access, roles, and statuses.</p>
            </div>
        </div>
      </div>

      {/* 🛠️ CONTROL BAR */}
      <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          
          {/* Left: Search */}
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

          {/* Right: Custom Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end z-10">
            
            <CustomDropdown 
              label="Role" 
              options={roleOptions} 
              value={roleFilter} 
              onChange={setRoleFilter} 
              icon={Shield}
            />

            <CustomDropdown 
              label="Status" 
              options={statusOptions} 
              value={statusFilter} 
              onChange={setStatusFilter}
              icon={CircleDot} 
            />

            {/* Clear Filters Button */}
            {(roleFilter !== "all" || statusFilter !== "all") && (
              <button 
                onClick={() => {setRoleFilter("all"); setStatusFilter("all");}}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-full transition-colors"
              >
                Clear
              </button>
            )}

          </div>
        </div>
      </div>

      {/* 📊 THE DATA TABLE */}
      <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden z-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[25%]">Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[30%]">Email Address</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[15%]">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[15%]">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[15%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <tr key={u._id} className={`group transition-colors ${u.disabled ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}>
                
                {/* 1. Identity */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 ${u.disabled ? 'grayscale opacity-70' : ''}`}>
                          {u.isSystem ? (
                            <div className="bg-slate-900 w-full h-full flex items-center justify-center text-white"><Command size={14}/></div>
                          ) : u.image ? (
                            <img src={u.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400"><User size={16}/></div>
                          )}
                      </div>
                      {u.isYou && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full"></div>}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${u.disabled ? 'text-slate-500' : 'text-slate-900'}`}>
                        {u.name} {u.isYou && <span className="ml-1.5 text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Email (Hidden for System Admin - No dash) */}
                <td className="px-6 py-4">
                   {!u.isSystem ? (
                       <div className={`flex items-center gap-2 text-sm ${u.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Mail size={14} className="text-slate-400 opacity-70"/> 
                            <span className="truncate max-w-[200px]">{u.email}</span>
                       </div>
                   ) : null}
                </td>

                {/* 3. Role */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                    u.role === 'admin' ? 'bg-red-50 text-red-500 border-red-100' :
                    u.role === 'staff' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {u.role === 'admin' && <Shield size={12} />}
                    {u.role === 'staff' && <User size={12} />}
                    {u.role === 'user' && <User size={12} />}
                    
                    {u.role === 'user' ? 'Guest' : u.role}
                  </span>
                </td>

                {/* 4. Status */}
                <td className="px-6 py-4">
                  {u.disabled ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold">
                        <XCircle size={12} /> Frozen
                      </div>
                  ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold">
                        <CircleDot size={12} className="animate-pulse" /> Active
                      </div>
                  )}
                </td>

                {/* 5. Actions */}
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      {!u.isYou && !u.isSystem && (
                         <button 
                           onClick={() => changeUserStatus(u._id)}
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              u.disabled 
                              ? 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                           }`}
                         >
                           {u.disabled ? <Unlock size={14}/> : <Lock size={14}/>}
                           {u.disabled ? "Enable" : "Disable"}
                         </button>
                      )}
                   </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {/* EMPTY STATE */}
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Filter className="text-slate-300" size={24} />
            </div>
            <h3 className="text-slate-900 font-bold">No users found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
              Try adjusting your role or status filters to find what you are looking for.
            </p>
            <button 
              onClick={() => {setSearch(""); setRoleFilter("all"); setStatusFilter("all");}}
              className="mt-4 text-indigo-600 text-xs font-bold uppercase hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;