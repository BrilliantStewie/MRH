import React, { useState, useContext } from "react";
import { AdminContext } from "../../context/AdminContext";
import { X, UserPlus, Mail, Phone, Lock } from "lucide-react";
import { toast } from "react-toastify";

const AddUser = ({ onClose }) => {
  const { aToken, backendUrl, getAllUsers } = useContext(AdminContext);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "", // Optional
    role: "user"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In your backend, if password is empty, you should generate a random one 
      // or handle it as a 'manual-entry' account.
      const response = await fetch(`${backendUrl}/api/admin/add-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'aToken': aToken 
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Guest account created!");
        getAllUsers();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error creating account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between bg-slate-900 p-5 text-white sm:p-6">
          <div className="flex items-center gap-3">
            <UserPlus size={20} className="text-indigo-400" />
            <h2 className="text-xl font-bold">Add Guest Profile</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500">First Name *</label>
              <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" 
                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500">Last Name *</label>
              <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" 
                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-500">Middle Name (Optional)</label>
            <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
              value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
          </div>

          <hr className="border-slate-100 my-2" />

          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="email" placeholder="Email (Optional)" className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Contact Number (Optional)" className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="password" placeholder="Password (Optional)" className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-black">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
