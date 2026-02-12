import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Search, 
  User, 
  Users as UsersIcon, 
  Mail, 
  Command, 
  Shield,
  CircleDot,
  XCircle,
  ChevronDown,
  Check,
  RefreshCcw,
  PenBox, 
  Ban,     
  UserPlus,
  Phone,
  Lock,
  X
} from "lucide-react";
import { toast } from "react-toastify";

// --- CustomDropdown Component ---
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
        {Icon && <Icon size={14} className={value !== 'all' ? "text-indigo-500" : "text-slate-400"} />}
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

const Users = () => {
  const { aToken, allUsers, getAllUsers, changeUserStatus, addGuestUser, updateStaff } = useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [adminInfo, setAdminInfo] = useState({ email: "", isYou: false });
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    if (aToken) getAllUsers();
  }, [aToken]); 

  useEffect(() => {
    if (aToken) {
        try {
            const payload = JSON.parse(atob(aToken.split(".")[1]));
            setAdminInfo({ email: payload.email || "", isYou: payload.role === "admin" });
        } catch (e) {
            setAdminInfo({ email: "", isYou: false });
        }
    }
  }, [aToken]);

  const getFullName = (u) => {
    if (u.isSystem) return "MRH Admin";
    if (u.firstName) {
      const middle = u.middleName ? `${u.middleName} ` : '';
      return `${u.firstName} ${middle}${u.lastName}`.trim();
    }
    return u.name || "Unknown User";
  };

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
      const fullName = getFullName(u).toLowerCase();
      const matchSearch = !search || 
        fullName.includes(search.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === "all" || u.role === roleFilter;

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = !u.disabled;
      if (statusFilter === "disabled") matchStatus = u.disabled; // Updated from frozen

      return matchSearch && matchRole && matchStatus;
    });
  }, [allUsers, search, roleFilter, statusFilter, adminUser]);

  const handleEdit = (user) => {
    setEditData(user);
    setShowAddModal(true);
  };

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "staff", label: "Staff", icon: Shield },
    { value: "user", label: "Guest", icon: User },
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active", icon: CircleDot },
    { value: "disabled", label: "Disabled", icon: XCircle }, // Updated from frozen
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-4 lg:p-8">
      
      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                <UsersIcon className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users</h1>
                <p className="text-slate-500 text-sm font-medium">Manage system access and roles.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => { setEditData(null); setShowAddModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-all shadow-md shadow-slate-200"
            >
                <UserPlus size={16} />
                <span className="text-sm font-bold">Add Guest</span>
            </button>
            <button 
                onClick={() => getAllUsers()} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
            >
                <RefreshCcw size={16} />
                <span className="text-sm font-semibold sm:inline hidden">Refresh</span>
            </button>
        </div>
      </div>

      {/* CONTROL BAR */}
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
            <CustomDropdown label="Role" options={roleOptions} value={roleFilter} onChange={setRoleFilter} icon={Shield} />
            <CustomDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} icon={CircleDot} />
            {(roleFilter !== "all" || statusFilter !== "all" || search) && (
              <button 
                onClick={() => {setSearch(""); setRoleFilter("all"); setStatusFilter("all");}}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-full transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                <tr key={u._id} className={`group transition-colors ${u.disabled ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 relative ${u.disabled ? 'grayscale opacity-70' : ''}`}>
                          {u.isSystem ? (
                            <div className="bg-slate-900 w-full h-full flex items-center justify-center text-white"><Command size={14}/></div>
                          ) : u.image ? (
                            <img src={u.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400"><User size={16}/></div>
                          )}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${u.disabled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {getFullName(u)} 
                            {u.isYou && <span className="ml-1.5 text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {!u.isSystem ? (
                        <div className={`flex items-center gap-2 text-sm ${u.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Mail size={14} className="text-slate-400 opacity-70"/> 
                          <span className="truncate max-w-[200px]">{u.email || <span className="italic text-slate-300">No Email</span>}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">System Protected</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        u.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        u.role === 'staff' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {u.role === 'user' ? 'Guest' : u.role || 'User'}
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
                      <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {!u.isYou && !u.isSystem && (
                          <>
                            <button 
                                onClick={() => changeUserStatus(u._id)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                                    u.disabled 
                                    ? 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                    : 'bg-white border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'
                                }`}
                            >
                                {u.disabled ? <RefreshCcw size={14}/> : <Ban size={14}/>}
                                {u.disabled ? "Enable" : "Disable"}
                            </button>

                            <button 
                                onClick={() => handleEdit(u)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-black hover:text-white transition-all border border-indigo-100 shadow-sm"
                            >
                                <PenBox size={14} />
                                Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                </tr>
                ))
            ) : (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500 font-medium">No users found match your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD GUEST MODAL */}
      {showAddModal && (
        <AddGuestModal 
            onClose={() => { setShowAddModal(false); setEditData(null); }} 
            editData={editData} 
            addGuestUser={addGuestUser}
            updateStaff={updateStaff}
            getAllUsers={getAllUsers}
        />
      )}
    </div>
  );
};

// --- AddGuestModal Component ---
const AddGuestModal = ({ onClose, editData, addGuestUser, updateStaff, getAllUsers }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: editData?.firstName || "",
        lastName: editData?.lastName || "",
        middleName: editData?.middleName || "",
        email: editData?.email || "",
        phone: editData?.phone || "",
        password: ""
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let success = false;
            if (editData) {
                // We use updateStaff for editing because it handles name rebuilding and optional fields
                success = await updateStaff({ userId: editData._id, ...formData });
            } else {
                success = await addGuestUser(formData);
            }

            if (success) {
                getAllUsers();
                onClose();
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <UserPlus size={20} className="text-indigo-400" />
                        <h2 className="text-xl font-bold">{editData ? "Edit Profile" : "Add Guest Profile"}</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">First Name *</label>
                            <input 
                                required 
                                type="text" 
                                value={formData.firstName}
                                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Last Name *</label>
                            <input 
                                required 
                                type="text" 
                                value={formData.lastName}
                                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Middle Name (Optional)</label>
                        <input 
                            type="text" 
                            value={formData.middleName}
                            onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                        />
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="email" 
                                placeholder="Email (Optional)" 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                            />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Phone (Optional)" 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="password" 
                                placeholder={editData ? "New Password (Leave blank to keep)" : "Password (Optional)"}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            disabled={loading}
                            onClick={onClose} 
                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:bg-slate-400"
                        >
                            {loading ? "Processing..." : editData ? "Save Changes" : "Create Profile"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Users;