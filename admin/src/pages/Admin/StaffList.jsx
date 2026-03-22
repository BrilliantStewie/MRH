import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Search, 
  UserPlus, 
  Shield, 
  User, 
  Phone, 
  Mail, 
  PenBox, 
  Ban,     
  CircleDot,
  XCircle,
  RefreshCcw,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import AddStaff from "./AddStaff";

const StaffList = () => {
  const { aToken, allUsers, getAllUsers, changeUserStatus } = useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState(null);
  
  // ✅ Toggle for Show More/Less
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (aToken) getAllUsers();
  }, [aToken]);

  const getFullName = (u) => {
    if (u.firstName) {
      const middle = u.middleName ? `${u.middleName} ` : '';
      const suffix = u.suffix ? ` ${u.suffix}` : '';
      return `${u.firstName} ${middle}${u.lastName}${suffix}`.trim();
    }
    return u.name || "Unknown Staff";
  }

  const handleEdit = (staffMember) => {
    setEditData(staffMember);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditData(null);
  };

  const toggleStatus = async (userId) => {
    const result = await changeUserStatus(userId);
    if (result) {
      getAllUsers();
    }
  };

  const staffList = useMemo(() => {
    const users = Array.isArray(allUsers) ? allUsers : [];
    const searchTerm = search.toLowerCase().trim();

    // 1. Filter the users first
    const filtered = users.filter((u) => {
      if (u.role !== "staff") return false;
      if (!searchTerm) return true;

      const fName = (u.firstName || "").toLowerCase();
      const lName = (u.lastName || "").toLowerCase();
      const mName = (u.middleName || "").toLowerCase();
      const sfx = (u.suffix || "").toLowerCase();

      return (
        fName.includes(searchTerm) ||
        lName.includes(searchTerm) ||
        mName.includes(searchTerm) ||
        sfx.includes(searchTerm)
      );
    });

    // 2. ✅ SORT: Display in Alphabetical Order (A-Z) by First Name
    return filtered.sort((a, b) => {
      const nameA = (a.firstName || "").toLowerCase();
      const nameB = (b.firstName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

  }, [allUsers, search]);

  // ✅ Limit display to 5
  const displayedStaff = expanded ? staffList : staffList.slice(0, 5);
  // ✅ Calculate how many are hidden
  const hiddenCount = staffList.length - 5;

  return (
    <div className="max-w-7xl mx-auto min-h-full">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             Staff Management
           </h1>
           <p className="text-slate-500 text-sm mt-1">Manage admin access and staff accounts.</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <UserPlus size={18} />
          Add Staff
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or suffix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase text-xs text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Staff Member</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayedStaff.map((s) => (
                <tr key={s._id} className={`group transition-colors ${s.disabled ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 overflow-hidden relative shadow-inner ${s.disabled ? 'grayscale opacity-70' : ''}`}>
                        {s.image && s.image.trim() !== "" ? (
                           <img 
                             src={s.image} 
                             alt="" 
                             className="w-full h-full object-cover" 
                             onError={(e) => { e.target.style.display = 'none'; }}
                           />
                        ) : (
                           <User size={22} className="text-slate-400" />
                        )}
                        
                      </div>

                      <div>
                          <span className={`text-sm font-bold ${s.disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                              {getFullName(s)}
                          </span>
                          <div className={`text-xs capitalize ${s.disabled ? 'text-slate-400' : 'text-slate-500'}`}>{s.role}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className={`flex items-center gap-2 text-sm ${s.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Mail size={14} className="text-slate-400 opacity-70"/> {s.email}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${s.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Phone size={14} className="text-slate-400 opacity-70"/> {s.phone || "-"}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {s.disabled ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle size={12} /> Disabled
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CircleDot size={12} className="animate-pulse" /> Active
                        </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      
                      <button 
                        onClick={() => toggleStatus(s._id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all
                          ${s.disabled 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                            : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'}`}
                        title={s.disabled ? "Enable Account" : "Disable Account"}
                      >
                        {s.disabled ? <RefreshCcw size={14} /> : <Ban size={14} />}
                        <span className="hidden lg:inline">{s.disabled ? "Enable" : "Disable"}</span>
                      </button>

                      <button 
                          onClick={() => handleEdit(s)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all border border-blue-100 shadow-sm"
                          title="Edit Details"
                      >
                          <span className="flex items-center gap-1">
                            <PenBox size={16} />
                            <span className="hidden lg:inline">Edit</span>
                          </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!staffList.length && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <User size={40} className="opacity-20"/>
                       <p>No staff members found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Show More (Count) / Show Less Button */}
        {staffList.length > 5 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-bold transition-all active:scale-95"
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

      {showAddModal && (
        <AddStaff 
          onClose={handleCloseModal} 
          getAllUsers={getAllUsers} 
          editData={editData}
        />
      )}

    </div>
  );
};

export default StaffList;

