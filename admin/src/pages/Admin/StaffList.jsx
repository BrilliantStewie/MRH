import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { Search, UserPlus, Shield, User, Phone, Mail } from "lucide-react";
import AddStaff from "./AddStaff"; // 👈 Import the new file

const StaffList = () => {
  const { aToken, allUsers, getAllUsers } = useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false); // Controls the popup

  useEffect(() => {
    if (aToken) getAllUsers();
  }, [aToken]);

  // Filter only staff members
  const staffList = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.role === "staff" &&
        (!search ||
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()))
    );
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
          Add New Staff
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
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
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {staffList.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-200">
                        {s.name ? s.name.charAt(0).toUpperCase() : <User size={20}/>}
                      </div>
                      <span className="font-semibold text-slate-800">{s.name}</span>
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

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      Staff Access
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                     {new Date(s.created_at || Date.now()).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {!staffList.length && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <User size={40} className="opacity-20"/>
                       <p>No staff members found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 👇 RENDER THE ADD STAFF COMPONENT HERE */}
      {showAddModal && (
        <AddStaff 
          onClose={() => setShowAddModal(false)} 
          getAllUsers={getAllUsers}
        />
      )}

    </div>
  );
};

export default StaffList;