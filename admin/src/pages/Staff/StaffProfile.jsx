import React, { useContext, useState, useEffect } from "react";
import { StaffContext } from "../../context/StaffContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  User, Mail, Camera, Save, Edit3,
  Eye, EyeOff, UserCircle, 
  CheckCircle, Shield, 
  Calendar, Info, Trash2
} from "lucide-react";

const StaffProfile = () => {
  const { sToken, backendUrl } = useContext(StaffContext);
  const [userData, setUserData] = useState(null);
  
  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [showPass, setShowPass] = useState({ old: false, new: false, cfm: false });

  // Local State
  const [localEditData, setLocalEditData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "", 
    email: "", 
    oldPassword: "", 
    newPassword: "", 
    confirmPassword: "",
  });

  // --- Helpers ---
  const formatPhoneForDisplay = (phone) => {
    if (!phone) return "";
    if (phone.startsWith("+63")) return "0" + phone.slice(3);
    if (phone.startsWith("63")) return "0" + phone.slice(2);
    return phone;
  };

  const formatPhoneForSave = (phone) => {
    if (phone.startsWith("0")) return "+63" + phone.slice(1);
    return phone;
  };

  // ✅ 1. INTELLIGENT PARSING (The "Separator" Logic)
  const parseFullName = (fullName) => {
      if (!fullName) return { first: "", mid: "", last: "" };
      
      // STRATEGY A: Check for our Secret Separator (|)
      // If the data was saved by this new code, it will have pipes.
      if (fullName.includes("|")) {
          const parts = fullName.split("|");
          return {
              first: parts[0] || "",
              mid: parts[1] || "",
              last: parts[2] || ""
          };
      }

      // STRATEGY B: Legacy Data (Old data saved with spaces)
      // Fallback logic for old accounts
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 1) return { first: parts[0], mid: "", last: "" };
      const last = parts.pop();
      const first = parts.join(" ");
      return { first, mid: "", last };
  };

  // ✅ 2. DISPLAY FORMATTER
  // Removes the secret separator so it looks nice in the header
  const getCleanName = (nameString) => {
      if (!nameString) return "Staff Member";
      return nameString.replace(/\|/g, " "); // Replace pipes with spaces
  };

  // --- Fetch Data ---
  const loadStaffProfile = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/staff/profile", {
        headers: { token: sToken },
      });
      if (data.success) {
        setUserData(data.userData);
        
        // Parse the name into the 3 separate boxes
        const { first, mid, last } = parseFullName(data.userData.name || "");

        setLocalEditData({
          firstName: first,
          middleName: mid,
          lastName: last,
          phone: formatPhoneForDisplay(data.userData.phone || ""),
          email: data.userData.email || "",
          oldPassword: "", 
          newPassword: "", 
          confirmPassword: "",
        });
        setImage(null);
        setRemoveImage(false);
      }
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  useEffect(() => {
    if (sToken) loadStaffProfile();
  }, [sToken]);

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  // ✅ 3. INPUT HANDLER
  const handleNameChange = (field, val) => {
    // Block the pipe character (|) so users can't break the logic
    if (/^[a-zA-Z\s-]*$/.test(val)) {
        const formatted = val.replace(/\b\w/g, (c) => c.toUpperCase());
        setLocalEditData(prev => ({ ...prev, [field]: formatted }));
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    if (/^[0-9]*$/.test(val) && val.length <= 11) {
        setLocalEditData(prev => ({ ...prev, phone: val }));
    }
  };

  // --- Update Profile ---
  const updateProfile = async () => {
    try {
      if (localEditData.phone.length !== 11) {
          return toast.error("Phone number must be exactly 11 digits");
      }
      if (!localEditData.firstName || !localEditData.lastName) {
          return toast.error("First and Last name are required");
      }

      const formData = new FormData();
      
      // ✅ 4. SAVING LOGIC
      // We join them with a PIPE (|) instead of a SPACE
      // This saves "Mary Joy|Dela|Cruz"
      const fullName = `${localEditData.firstName.trim()}|${localEditData.middleName.trim()}|${localEditData.lastName.trim()}`;

      formData.append("name", fullName);
      formData.append("email", localEditData.email);
      formData.append("phone", formatPhoneForSave(localEditData.phone));

      if (localEditData.newPassword) {
        if (localEditData.newPassword.length < 8) return toast.error("Password too short");
        if (localEditData.newPassword !== localEditData.confirmPassword) return toast.error("Passwords do not match");
        formData.append("oldPassword", localEditData.oldPassword);
        formData.append("newPassword", localEditData.newPassword);
      }

      if (removeImage) formData.append("removeImage", "true"); 
      else if (image) formData.append("image", image);

      const { data } = await axios.post(
        backendUrl + "/api/staff/update-profile",
        formData,
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Profile updated");
        setIsEdit(false);
        setImage(null);
        setRemoveImage(false);
        setLocalEditData(prev => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" }));
        loadStaffProfile();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const handleDiscard = () => {
    setIsEdit(false);
    setImage(null);
    setRemoveImage(false);
    
    const { first, mid, last } = parseFullName(userData.name || "");
    setLocalEditData({
        ...localEditData,
        firstName: first,
        middleName: mid,
        lastName: last,
        email: userData.email,
        phone: formatPhoneForDisplay(userData.phone)
    });
  };

  // Calculate display name for the Header (Clean version, no pipes)
  const previewName = `${localEditData.firstName} ${localEditData.middleName} ${localEditData.lastName}`.replace(/\|/g, " ").trim();
  const headerName = isEdit ? previewName : getCleanName(userData?.name);

  const hasValidImage = (image || (userData?.image && !removeImage));

  return userData && (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-visible relative">
          <div className="h-80 bg-[#0F172A] rounded-t-[2rem] w-full relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800 opacity-90"></div>
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>

          <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-16 relative z-10">
            {/* Profile Pic */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-[5px] border-white bg-slate-100 shadow-lg overflow-hidden flex items-center justify-center relative">
                {hasValidImage ? (
                   <img src={image ? URL.createObjectURL(image) : userData.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                   <User size={56} className="text-slate-300" />
                )}
                {isEdit && (
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white drop-shadow-md" size={24} />
                    <input type="file" hidden accept="image/*" onChange={(e) => { setImage(e.target.files[0]); setRemoveImage(false); }} />
                  </label>
                )}
              </div>
              {isEdit && hasValidImage && (
                <button onClick={() => { setRemoveImage(true); setImage(null); }} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full border-[3px] border-white shadow-sm hover:bg-red-600 transition-transform hover:scale-110 z-20">
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Header Details */}
            <div className="flex-1 mb-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{headerName}</h1>
                <CheckCircle size={18} className="text-blue-500 fill-blue-50" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
                 <Calendar size={12} /> Joined {userData.createdAt ? new Date(userData.createdAt).getFullYear() : "2026"}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 mb-2 w-full md:w-auto justify-center md:justify-end">
              {!isEdit ? (
                <button onClick={() => setIsEdit(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                  <Edit3 size={14}/> Edit Profile
                </button>
              ) : (
                <>
                  <button onClick={handleDiscard} className="px-4 py-2 text-slate-500 font-bold text-xs hover:text-slate-800 transition-colors uppercase tracking-wider">
                    Discard
                  </button>
                  <button onClick={updateProfile} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 uppercase tracking-wide">
                    <Save size={14} /> Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full"> <UserCircle size={20} /> </div>
              <div> <h2 className="text-lg font-bold text-slate-800">Account Details</h2> <p className="text-xs text-slate-400">Manage your personal identifying information.</p> </div>
            </div>

            <div className="space-y-6">
               
               {/* VIEW vs EDIT */}
               {!isEdit ? (
                    <div className="w-full">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Full Name</label>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                            <User size={16} className="text-slate-400 shrink-0"/>
                            <p className="w-full text-sm font-semibold text-slate-700">
                                {headerName}
                            </p>
                        </div>
                    </div>
               ) : (
                    <div className="w-full">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Personal Name (First / Mid / Last)</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* FIRST NAME */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                <User size={16} className="text-slate-400 shrink-0"/>
                                <input 
                                    value={localEditData.firstName}
                                    onChange={(e) => handleNameChange("firstName", e.target.value)}
                                    placeholder="First Name"
                                    className="bg-transparent w-full text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300"
                                />
                            </div>

                            {/* MIDDLE NAME */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                <input 
                                    value={localEditData.middleName}
                                    onChange={(e) => handleNameChange("middleName", e.target.value)}
                                    placeholder="Middle Name"
                                    className="bg-transparent w-full text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 text-center"
                                />
                            </div>

                            {/* LAST NAME */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                <input 
                                    value={localEditData.lastName}
                                    onChange={(e) => handleNameChange("lastName", e.target.value)}
                                    placeholder="Last Name"
                                    className="bg-transparent w-full text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>
               )}

               {/* Email & Phone */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email Address</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Mail size={16} className="text-slate-400"/>
                        <input disabled={!isEdit} value={localEditData.email} onChange={(e) => setLocalEditData({...localEditData, email: e.target.value})} className="bg-transparent w-full text-sm font-semibold text-slate-700 outline-none disabled:text-slate-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Phone Line (PH)</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-lg leading-none" title="Philippines">🇵🇭</span>
                        <input disabled={!isEdit} value={localEditData.phone} onChange={handlePhoneChange} maxLength={11} placeholder="09xxxxxxxxx" className="bg-transparent w-full text-sm font-semibold text-slate-700 outline-none disabled:text-slate-500 placeholder:text-slate-300 tracking-wide" />
                    </div>
                  </div>
               </div>

            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 h-fit">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-orange-50 text-orange-500 rounded-full"> <Shield size={20} /> </div>
                <h2 className="text-lg font-bold text-slate-800">Security</h2>
            </div>
            {!isEdit ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-500">To change your password, click "Edit Profile".</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {['oldPassword', 'newPassword', 'confirmPassword'].map((k) => (
                    <div className="relative" key={k}>
                        <input type={showPass[k] ? "text" : "password"} placeholder={k === 'oldPassword' ? 'Current Password' : k === 'newPassword' ? 'New Password' : 'Confirm Password'} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-200 transition-all placeholder:text-slate-400" value={localEditData[k]} onChange={(e) => setLocalEditData({ ...localEditData, [k]: e.target.value })} />
                        <button type="button" onClick={() => setShowPass({...showPass, [k]: !showPass[k]})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"> {showPass[k] ? <EyeOff size={14}/> : <Eye size={14}/>} </button>
                    </div>
                    ))}
                    <p className="text-[10px] text-slate-400 px-1 pt-2"> <Info size={10} className="inline mr-1"/> Changes take effect immediately. </p>
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StaffProfile;