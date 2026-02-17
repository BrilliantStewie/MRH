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
  UserCheck 
} from "lucide-react";
import AddStaff from "./AddStaff";

const StaffList = () => {
  const { aToken, allUsers, getAllUsers, changeUserStatus } = useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    if (aToken) getAllUsers();
  }, [aToken]);

  // UPDATED: Added suffix support to the name display logic
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
    return users.filter((u) => {
      // getFullName now includes suffix, making suffixes searchable
      const fullName = getFullName(u).toLowerCase();
      const matchRole = u.role === "staff"; 
      const matchSearch = !search || 
        fullName.includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase());
      
      return matchRole && matchSearch;
    });
  }, [allUsers, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Shield className="text-blue-600" size={24}/> 
             Staff Management
           </h1>
           <p className="text-slate-500 text-sm mt-1">Manage admin access and staff accounts.</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <UserPlus size={18} />
          Add New
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
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
              {staffList.map((s) => (
                <tr key={s._id} className={`hover:bg-slate-50 transition-colors group ${s.disabled ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 overflow-hidden relative shadow-inner">
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
                        
                        {s.disabled && (
                             <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                 <Ban size={14} className="text-white"/>
                             </div>
                        )}
                      </div>

                      <div>
                          <span className={`font-semibold ${s.disabled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {getFullName(s)}
                          </span>
                          <div className="text-xs text-slate-500 capitalize">{s.role}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={14} className="text-slate-400"/> {s.email}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="text-slate-400"/> {s.phone || "—"}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {s.disabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                            Disabled
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Active
                        </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      
                      <button 
                        onClick={() => toggleStatus(s._id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                          ${s.disabled 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white' 
                            : 'bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'}`}
                        title={s.disabled ? "Enable Account" : "Disable Account"}
                      >
                        {s.disabled ? <UserCheck size={16} /> : <Ban size={16} />}
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