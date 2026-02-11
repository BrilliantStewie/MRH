import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  User, Mail, Phone, Camera, Save, Edit3, Trash2, 
  Lock, ShieldCheck, Calendar, Eye, EyeOff,
  UserCircle, Settings, CheckCircle, BadgeCheck, Info, Loader2
} from "lucide-react";

const MyProfile = () => {
  const { userData, setUserData, token, backendUrl, loadUserProfileData } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // State for Image Handling
  const [image, setImage] = useState(null); // Stores NEW file to upload
  const [removeImage, setRemoveImage] = useState(false); // Flags if image should be removed

  // State for Passwords
  const [showPass, setShowPass] = useState({ old: false, new: false, cfm: false });
  const [localEditData, setLocalEditData] = useState({
    name: "", phone: "", email: "", oldPassword: "", newPassword: "", confirmPassword: "",
  });

  // Load User Data into Local State
  useEffect(() => {
    if (userData) {
      setLocalEditData({
        name: userData.name || "",
        phone: userData.phone || "",
        email: userData.email || "",
        oldPassword: "", newPassword: "", confirmPassword: "",
      });
      setRemoveImage(false);
      setImage(null);
    }
  }, [userData]);

  // Handle Remove Image Click
  const handleRemoveImage = () => {
    setImage(null);          
    setRemoveImage(true);    
  };

  // Submit Updates
  const updateUserProfileData = async () => {
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("name", localEditData.name);
      formData.append("phone", localEditData.phone);
      formData.append("email", localEditData.email);

      if (removeImage) {
        formData.append("removeImage", "true");
      }

      if (localEditData.newPassword) {
        if (localEditData.newPassword !== localEditData.confirmPassword) {
          toast.error("Verification failed: Passwords mismatch");
          setIsUpdating(false);
          return;
        }
        formData.append("oldPassword", localEditData.oldPassword);
        formData.append("newPassword", localEditData.newPassword);
      }

      if (image) {
         formData.append("image", image);
      }

      const { data } = await axios.post(
        backendUrl + "/api/user/update-profile", 
        formData, 
        { headers: { token } } 
      );

      if (data.success) {
        toast.success("Profile updated successfully!");
        setUserData((prev) => ({ ...prev, ...data.userData }));
        setIsEdit(false);
        setImage(null);
        setRemoveImage(false);
        setLocalEditData(prev => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" }));
        if (loadUserProfileData) loadUserProfileData();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  // ✅ LOGIC UPDATED: Returns null if no image exists (so we can show the Icon)
  const displayImage = image 
    ? URL.createObjectURL(image) 
    : (removeImage ? null : userData.image);

  return (
    <div className="min-h-screen bg-slate-50/60 pt-24 pb-14 px-4 md:px-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- HEADER CARD --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-32 bg-[#0F172A] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-[#1e1b4b] opacity-90"></div>
          </div>

          <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-14">
            <div className="relative group shrink-0">
              
              {/* ✅ PROFILE PICTURE CONTAINER */}
              <div className="w-32 h-32 rounded-full border-[6px] border-white bg-slate-100 shadow-lg overflow-hidden transition-transform group-hover:scale-105 duration-300 flex justify-center items-center">
                {displayImage ? (
                  // Show Image if available
                  <img
                    src={displayImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // ✅ Show Default People Icon if no image
                  <User size={64} className="text-slate-300" strokeWidth={1.5} />
                )}
              </div>
              
              {isEdit && (
                <>
                  {/* Upload Overlay */}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Camera className="text-white" size={24} />
                    <input 
                      type="file" 
                      hidden 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImage(e.target.files[0]);
                          setRemoveImage(false); 
                        }
                      }} 
                    />
                  </label>

                  {/* Remove Button - Only show if there is an image to remove */}
                  {displayImage && (
                    <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors z-20"
                        title="Remove photo"
                        type="button"
                    >
                        <Trash2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex-grow mb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{userData.name}</h1>
                <BadgeCheck className="text-blue-500 fill-blue-50" size={20}/>
              </div>
              <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mt-1 italic">
                <Calendar size={14} /> Registered Member {new Date().getFullYear()}
              </p>
            </div>

            <div className="mb-2">
              {!isEdit ? (
                <button 
                  onClick={() => setIsEdit(true)} 
                  className="px-6 py-2.5 bg-[#0F172A] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <Edit3 size={16}/> Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                        setIsEdit(false); 
                        setImage(null); 
                        setRemoveImage(false); 
                    }} 
                    className="px-5 py-2.5 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
                    disabled={isUpdating}
                  >
                    Discard
                  </button>
                  <button 
                    onClick={updateUserProfileData} 
                    disabled={isUpdating}
                    className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-100 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: PERSONAL INFORMATION */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><UserCircle size={22}/></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Account Details</h2>
                <p className="text-slate-400 text-xs font-medium">Manage your personal identifying information.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 flex-grow">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <div className="group flex items-center gap-3 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus-within:border-blue-500 focus-within:bg-white transition-all">
                    <User size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                    <input
                      disabled={!isEdit}
                      value={localEditData.name}
                      onChange={(e) => setLocalEditData({ ...localEditData, name: e.target.value })}
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none disabled:opacity-60"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="group flex items-center gap-3 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <Mail size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.email}
                    onChange={(e) => setLocalEditData({ ...localEditData, email: e.target.value })}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Line</label>
                <div className="group flex items-center gap-3 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <Phone size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.phone}
                    onChange={(e) => setLocalEditData({ ...localEditData, phone: e.target.value })}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: SECURITY SIDEBAR */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Settings size={22}/></div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Security</h2>
                </div>

                {!isEdit ? (
                <div className="py-8 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <div className="inline-flex p-3 bg-green-50 text-green-600 rounded-full mx-auto mb-3 shadow-sm">
                    <CheckCircle size={28} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Connection Secure</p>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest">End-to-End Encrypted</p>
                </div>
                ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {['oldPassword', 'newPassword', 'confirmPassword'].map((k) => (
                    <div className="relative group" key={k}>
                        <input
                        type={showPass[k] ? "text" : "password"}
                        placeholder={k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black tracking-widest outline-none focus:border-blue-500 focus:bg-white transition-all"
                        value={localEditData[k]}
                        onChange={(e) => setLocalEditData({ ...localEditData, [k]: e.target.value })}
                        />
                        <button 
                        type="button" 
                        onClick={() => setShowPass({...showPass, [k]: !showPass[k]})} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                        >
                        {showPass[k] ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                    ))}
                </div>
                )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-50">
                <div className="flex items-start gap-2 text-slate-400 italic">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">Changes to your legal name may take up to 24 hours to reflect across all systems.</p>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyProfile;