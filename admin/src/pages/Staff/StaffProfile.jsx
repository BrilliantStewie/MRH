import React, { useContext, useState, useEffect } from "react";
import { StaffContext } from "../../context/StaffContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  User, Mail, Phone, Camera, Save, Edit3,
  Eye, EyeOff, UserCircle, 
  CheckCircle, Shield, 
  Briefcase, Calendar, Fingerprint, Info
} from "lucide-react";

const StaffProfile = () => {
  const { sToken, backendUrl } = useContext(StaffContext);
  const [userData, setUserData] = useState(null);
  
  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [showPass, setShowPass] = useState({ old: false, new: false, cfm: false });

  const [localEditData, setLocalEditData] = useState({
    name: "", 
    phone: "", 
    email: "", 
    oldPassword: "", 
    newPassword: "", 
    confirmPassword: "",
  });

  // --- 1. Fetch Staff Data ---
  const loadStaffProfile = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/staff/profile", {
        headers: { token: sToken },
      });
      if (data.success) {
        setUserData(data.userData);
        setLocalEditData({
          name: data.userData.name || "",
          phone: data.userData.phone || "",
          email: data.userData.email || "",
          oldPassword: "", 
          newPassword: "", 
          confirmPassword: "",
        });
      }
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  useEffect(() => {
    if (sToken) loadStaffProfile();
  }, [sToken]);

  // --- 2. Image Preview Cleanup (Prevents Memory Leaks) ---
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  // --- 3. Update Function (The Fix) ---
  const updateProfile = async () => {
    try {
      const formData = new FormData();

      // Basic Info
      formData.append("name", localEditData.name);
      formData.append("email", localEditData.email);
      formData.append("phone", localEditData.phone);

      // Password Handling: Only append if user is trying to change it
      if (localEditData.newPassword) {
        if (localEditData.newPassword.length < 8) {
             return toast.error("Password must be at least 8 characters");
        }
        if (localEditData.newPassword !== localEditData.confirmPassword) {
          return toast.error("New passwords do not match");
        }
        formData.append("oldPassword", localEditData.oldPassword);
        formData.append("newPassword", localEditData.newPassword);
      }

      // Image Handling: Only append if a NEW file was selected
      if (image) {
        formData.append("image", image);
      }

      const { data } = await axios.post(
        backendUrl + "/api/staff/update-profile",
        formData,
        {
          headers: {
            token: sToken,
            // CRITICAL FIX: Do NOT manually set Content-Type to multipart/form-data here.
            // Axios/Browser must set it automatically to include the 'boundary'.
            // Setting it manually is what caused your "undefined" error.
          },
        }
      );

      if (data.success) {
        toast.success("Staff profile updated");
        setIsEdit(false);
        setImage(null);
        // Clear sensitive fields locally
        setLocalEditData((prev) => ({
          ...prev, 
          oldPassword: "", 
          newPassword: "", 
          confirmPassword: "" 
        }));
        loadStaffProfile();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return userData && (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- HEADER CARD --- */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all duration-500">
          <div className="h-40 bg-slate-900 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-900 opacity-80"></div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          </div>

          <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-8 -mt-16 relative z-10">
            <div className="relative group shrink-0">
              <div className="w-36 h-36 rounded-full border-[6px] border-white bg-white shadow-2xl overflow-hidden">
                <img
                  src={image ? URL.createObjectURL(image) : (userData.image || "https://via.placeholder.com/150")}
                  alt="Staff Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              {isEdit && (
                <label className="absolute inset-0 flex items-center justify-center bg-indigo-600/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Camera className="text-white" size={28} />
                  <input type="file" hidden accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
                </label>
              )}
            </div>

            <div className="flex-grow mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{userData.name}</h1>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                    <Shield size={12} className="fill-indigo-600/10" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified Staff</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2">
                    <Briefcase size={14} className="text-indigo-500" /> Property Operations
                </p>
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2">
                    <Calendar size={14} className="text-emerald-500" /> Joined {userData.createdAt ? new Date(userData.createdAt).getFullYear() : "2026"}
                </p>
              </div>
            </div>

            <div className="mb-2">
              {!isEdit ? (
                <button 
                  onClick={() => setIsEdit(true)} 
                  className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2"
                >
                  <Edit3 size={16}/> Edit Profile
                </button>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => { setIsEdit(false); setImage(null); }} className="px-6 py-3.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-colors">Discard</button>
                  <button onClick={updateProfile} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95 flex items-center gap-2">
                    <Save size={16} /> Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: INFO */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 flex flex-col">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100"><UserCircle size={24}/></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Profile Information</h2>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-0.5">Staff Details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 flex-grow">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1 block">Full Name</label>
                <div className="group flex items-center gap-4 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-indigo-500 focus-within:bg-white transition-all duration-300">
                    <User size={18} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors"/>
                    <input
                      disabled={!isEdit}
                      value={localEditData.name}
                      onChange={(e) => setLocalEditData({ ...localEditData, name: e.target.value })}
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none disabled:opacity-60"
                      placeholder="Enter full name"
                    />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1 block">Email</label>
                <div className="group flex items-center gap-4 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-indigo-500 focus-within:bg-white transition-all duration-300">
                  <Mail size={18} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.email}
                    onChange={(e) => setLocalEditData({ ...localEditData, email: e.target.value })}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60"
                    placeholder="name@property.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1 block">Contact Number</label>
                <div className="group flex items-center gap-4 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-indigo-500 focus-within:bg-white transition-all duration-300">
                  <Phone size={18} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.phone}
                    onChange={(e) => setLocalEditData({ ...localEditData, phone: e.target.value })}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60"
                    placeholder="+63 000 0000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: SECURITY */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100"><Fingerprint size={24}/></div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Security</h2>
                </div>
            </div>

            <div className="flex-grow">
                {!isEdit ? (
                <div className="py-12 px-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 text-center flex flex-col items-center">
                    <div className="p-4 bg-white text-emerald-500 rounded-full shadow-sm mb-4 border border-slate-100">
                        <CheckCircle size={32} />
                    </div>
                    <p className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Authentication Verified</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold max-w-[180px] leading-relaxed">Your account uses end-to-end encrypted session keys.</p>
                </div>
                ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {['oldPassword', 'newPassword', 'confirmPassword'].map((k) => (
                    <div className="relative group" key={k}>
                        <input
                        type={showPass[k] ? "text" : "password"}
                        placeholder={k.replace(/([A-Z])/g, ' $1').toUpperCase()}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black tracking-[0.2em] outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        value={localEditData[k]}
                        onChange={(e) => setLocalEditData({ ...localEditData, [k]: e.target.value })}
                        />
                        <button 
                        type="button" 
                        onClick={() => setShowPass({...showPass, [k]: !showPass[k]})} 
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                        {showPass[k] ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>
                    ))}
                </div>
                )}
            </div>
            
            <div className="mt-10 pt-8 border-t border-slate-50">
                <div className="flex items-start gap-3 text-slate-400">
                    <Info size={16} className="shrink-0 mt-0.5 text-indigo-400" />
                    <p className="text-[10px] leading-relaxed font-bold uppercase tracking-tight">Security Protocol: Passwords must contain at least 8 characters.</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;