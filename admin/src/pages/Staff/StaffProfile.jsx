import React, { useContext, useState, useEffect, useRef } from "react";
import { StaffContext } from "../../context/StaffContext";
import axios from "axios";
import { toast } from "react-toastify";
import VerifyFirebasePhoneOtp from "../../components/VerifyFirebasePhoneOtp";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import {
  User, Mail, Phone, Camera, Save, Edit3,
  Eye, EyeOff, UserCircle, 
  CheckCircle, Shield, 
  Calendar, Info, Trash2, XCircle
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
    suffix: "", 
    phone: "", 
    email: "", 
    oldPassword: "", 
    newPassword: "", 
    confirmPassword: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const recaptchaRef = useRef(null);

  // --- Helper: Roman Numeral to Integer ---
  const romanToInt = (str) => {
    if (!str) return 0;
    const map = { i: 1, v: 5, x: 10, l: 50, c: 100 };
    const s = str.toLowerCase();
    let result = 0;
    
    for (let i = 0; i < s.length; i++) {
        const curr = map[s[i]];
        const next = map[s[i + 1]];
        if (next && curr < next) {
            result -= curr;
        } else {
            result += curr;
        }
    }
    return result;
  };

  // --- Helper: Check if Input is Permissible ---
  const isInputAllowed = (val) => {
      if (!val) return true; // Allow empty (deleting)

      // 1. Strict Character Check: Letters and Dots only
      if (!/^[a-zA-Z.]+$/.test(val)) return false;

      // 2. STOP "TOO MANY DOTS" (Max 1 dot allowed)
      // This line counts the dots. If > 1, block input.
      if ((val.match(/\./g) || []).length > 1) return false;

      // Clean the input (remove dots) to check the underlying logic
      const clean = val.trim().toLowerCase().replace(/\./g, ""); 

      // 3. Check Words (Prefix Matching)
      // Allow typing if it matches the start of "junior", "senior", "jr", "sr"
      const wordOptions = ["jr", "sr", "junior", "senior"];
      const isWordMatch = wordOptions.some(opt => opt.startsWith(clean));
      if (isWordMatch) return true;

      // 4. Check Roman Numerals
      // Must only contain I, V, X, L, C (No D or M)
      if (/^[ivxlc]+$/.test(clean)) {
          // Validate Roman Structure 1-100
          const validRomanStructure = /^c$|^(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
          
          if (validRomanStructure.test(clean)) {
             const value = romanToInt(clean);
             // Limit: Must be <= 100
             if (value > 0 && value <= 100) {
                 return true;
             }
          }
      }

      return false; // Block input if it fits neither category
  };

  // --- Helpers: Phone Formatting ---
  const normalizePhoneInput = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("63") && digits.length === 12) {
      return `0${digits.slice(2)}`;
    }
    return digits;
  };

  const isValidPHNumber = (value) => /^09\d{9}$/.test(value);

  const formatPhoneForDisplay = (phone) => {
    if (!phone) return "";
    if (phone.startsWith("+63")) return "0" + phone.slice(3);
    if (phone.startsWith("63")) return "0" + phone.slice(2);
    return phone;
  };

  const formatPhoneForSave = (phone) => phone;

  // --- Helpers: Name Parsing ---
  const parseFullName = (fullName) => {
      if (!fullName) return { first: "", mid: "", last: "", suffix: "" };
      
      if (fullName.includes("|")) {
          const parts = fullName.split("|");
          return {
              first: parts[0] || "",
              mid: parts[1] || "",
              last: parts[2] || "",
              suffix: parts[3] || ""
          };
      }

      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 1) return { first: parts[0], mid: "", last: "", suffix: "" };
      const last = parts.pop();
      const first = parts.join(" ");
      return { first, mid: "", last, suffix: "" };
  };

  const getCleanName = (nameString) => {
      if (!nameString) return "Staff Member";
      return nameString.replace(/\|/g, " ").trim(); 
  };

  // --- Input Handlers ---
  const handleNameChange = (field, val) => {
    
    // 1. SUFFIX Logic (Strict Validation & Blocking)
    if (field === "suffix") {
        // PRE-VALIDATION: Check if we should allow this character
        if (!isInputAllowed(val)) {
            return; // Block invalid input
        }

        // FORMATTING: If allowed, format it
        let formatted = val;
        // Remove all dots to check the letters
        const lowerVal = val.trim().toLowerCase().replace(/\./g, '');
        const isRomanChars = /^[ivxlc]+$/i.test(lowerVal);

        if (val.length > 0) {
            if (isRomanChars) {
                // Roman -> UpperCase (e.g., "iii." -> "III.")
                formatted = val.toUpperCase(); 
            } else {
                // Word -> TitleCase (e.g., "jr." -> "Jr.")
                formatted = val.charAt(0).toUpperCase() + val.slice(1); 
            }
        }
        
        setLocalEditData(prev => ({ ...prev, [field]: formatted }));
        return;
    }

    // 2. NAMES Logic
    if (/^[a-zA-Z\s-]*$/.test(val)) {
        const formatted = val.replace(/\b\w/g, (c) => c.toUpperCase());
        setLocalEditData(prev => ({ ...prev, [field]: formatted }));
    }
  };

  const handlePhoneChange = (e) => {
    const normalized = normalizePhoneInput(e.target.value).slice(0, 11);
    if (/^[0-9]*$/.test(normalized)) {
      setLocalEditData((prev) => ({ ...prev, phone: normalized }));
      if (normalized && !isValidPHNumber(normalized)) {
        setPhoneError("Use an 11-digit PH number starting with 09.");
      } else {
        setPhoneError("");
      }
      setPhoneOtpSent(false);
      setPhoneOtpVerified(false);
    }
  };

  // --- Fetch Data ---
  const loadStaffProfile = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/staff/profile", {
        headers: { token: sToken },
      });
      if (data.success) {
        setUserData(data.userData);
        
        const parsedName = parseFullName(data.userData.name || "");
        const normalizedPhone = normalizePhoneInput(data.userData.phone || "");

        setLocalEditData({
          firstName: data.userData.firstName || parsedName.first,
          middleName: data.userData.middleName || parsedName.mid,
          lastName: data.userData.lastName || parsedName.last,
          suffix: parsedName.suffix || "",
          phone: normalizedPhone,
          email: data.userData.email || "",
          oldPassword: "", 
          newPassword: "", 
          confirmPassword: "",
        });
        setOriginalPhone(normalizedPhone);
        setPhoneError("");
        setPhoneOtpSent(false);
        setPhoneOtpVerified(false);
        setFirebaseConfirmation(null);
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

  // --- Update Profile ---
  const updateProfile = async () => {
    try {
      const normalizedPhone = normalizePhoneInput(localEditData.phone);
      const normalizedOriginal = normalizePhoneInput(originalPhone);
      const phoneChanged = normalizedPhone !== normalizedOriginal;

      if (normalizedPhone && !isValidPHNumber(normalizedPhone)) {
        return toast.error("Phone number must be a valid PH format (09XXXXXXXXX)");
      }
      if (phoneChanged && !phoneOtpVerified) {
        return toast.error("Please verify your phone number first.");
      }
      if (!localEditData.firstName || !localEditData.lastName) {
          return toast.error("First and Last name are required");
      }

      const formData = new FormData();
      
      formData.append("firstName", localEditData.firstName.trim());
      formData.append("middleName", localEditData.middleName.trim());
      formData.append("lastName", localEditData.lastName.trim());
      
      const fullName = `${localEditData.firstName.trim()}|${localEditData.middleName.trim()}|${localEditData.lastName.trim()}|${localEditData.suffix.trim()}`;
      formData.append("name", fullName);

      formData.append("email", localEditData.email);
      formData.append("phone", formatPhoneForSave(normalizedPhone));

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

  const ensureRecaptcha = async () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    await recaptchaRef.current.render();
    return recaptchaRef.current;
  };

  const sendFirebasePhoneOtp = async () => {
    const normalizedPhone = normalizePhoneInput(localEditData.phone);
    if (!isValidPHNumber(normalizedPhone)) {
      setPhoneError("Use an 11-digit PH number starting with 09.");
      return { success: false, message: "Invalid phone number" };
    }

    setPhoneError("");
    setPhoneOtpLoading(true);
    try {
      const verifier = await ensureRecaptcha();
      const e164 = `+63${normalizedPhone.slice(1)}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setFirebaseConfirmation(confirmation);
      setPhoneOtpSent(true);
      setShowPhoneOtpModal(true);
      toast.success("OTP sent to your phone.");
      return { success: true };
    } catch (err) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      toast.error(err?.message || "Failed to send OTP.");
      return { success: false, message: err?.message || "Failed to send OTP." };
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleVerifyFirebasePhone = async (otpCode) => {
    if (!firebaseConfirmation) {
      return { success: false, message: "Please request a new OTP." };
    }
    try {
      const result = await firebaseConfirmation.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      const { data } = await axios.post(
        backendUrl + "/api/staff/verify-phone-firebase",
        { idToken },
        { headers: { token: sToken } }
      );
      if (data.success) {
        setPhoneOtpVerified(true);
        setPhoneOtpSent(true);
        setOriginalPhone(normalizePhoneInput(data.phone));
        loadStaffProfile();
        await signOut(auth);
        return { success: true };
      }
      return { success: false, message: data.message || "Failed to verify phone." };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err?.message || "Failed to verify phone." };
    }
  };

  const handleDiscard = () => {
    setIsEdit(false);
    setImage(null);
    setRemoveImage(false);
    
    const parsedName = parseFullName(userData.name || "");
    const normalizedPhone = normalizePhoneInput(userData.phone || "");
    setLocalEditData({
        ...localEditData,
        firstName: userData.firstName || parsedName.first,
        middleName: userData.middleName || parsedName.mid,
        lastName: userData.lastName || parsedName.last,
        suffix: parsedName.suffix || "",
        email: userData.email,
        phone: normalizedPhone
    });
    setOriginalPhone(normalizedPhone);
    setPhoneError("");
    setPhoneOtpSent(false);
    setPhoneOtpVerified(false);
  };

  const previewName = `${localEditData.firstName} ${localEditData.middleName} ${localEditData.lastName} ${localEditData.suffix}`.replace(/\|/g, " ").trim();
  const headerName = isEdit ? previewName : getCleanName(userData?.name);
  const hasValidImage = (image || (userData?.image && !removeImage));

  const isSuffixFilled = localEditData.suffix.length > 0;

  return userData && (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <div id="recaptcha-container" className="hidden"></div>
      {showPhoneOtpModal && (
        <VerifyFirebasePhoneOtp
          phone={normalizePhoneInput(localEditData.phone)}
          onClose={() => setShowPhoneOtpModal(false)}
          onVerify={handleVerifyFirebasePhone}
          onResend={sendFirebasePhoneOtp}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-visible relative">
          <div className="h-40 bg-[#0F172A] rounded-t-[2rem] w-full relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800 opacity-90"></div>
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>

          <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-14 relative z-10">
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
          
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <UserCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Account Details</h2>
                <p className="text-slate-400 text-xs font-medium">
                  Manage your personal identifying information.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6 flex-grow">
              {!isEdit ? (
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <User size={14} className="text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">{headerName}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      First Name
                    </label>
                    <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 transition-all shadow-sm">
                      <input
                        value={localEditData.firstName}
                        onChange={(e) => handleNameChange("firstName", e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                        placeholder="First Name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Middle Name
                    </label>
                    <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 transition-all shadow-sm">
                      <input
                        value={localEditData.middleName}
                        onChange={(e) => handleNameChange("middleName", e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none text-center"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Last Name
                    </label>
                    <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 transition-all shadow-sm">
                      <input
                        value={localEditData.lastName}
                        onChange={(e) => handleNameChange("lastName", e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Suffix
                    </label>
                    <div
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-sm ${
                        isSuffixFilled
                          ? "border border-green-300 bg-green-50"
                          : "border border-slate-200 bg-white focus-within:border-blue-500"
                      }`}
                    >
                      <input
                        value={localEditData.suffix}
                        onChange={(e) => handleNameChange("suffix", e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none text-center"
                        placeholder="Jr. / III"
                      />
                      {isSuffixFilled && <CheckCircle size={16} className="text-green-500" />}
                    </div>
                  </div>
                </>
              )}

              <div className="md:col-span-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Email Address
                </label>
                <div
                  className={`group flex items-center gap-3 px-5 py-3.5 border rounded-xl transition-all ${
                    isEdit ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <Mail size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.email}
                    onChange={(e) => setLocalEditData({ ...localEditData, email: e.target.value })}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Phone Line (PH)
                </label>
                <div
                  className={`group relative flex items-center gap-3 px-5 py-3.5 border rounded-xl transition-all ${
                    isEdit ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <Phone size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.phone}
                    onChange={handlePhoneChange}
                    maxLength={11}
                    placeholder="09XXXXXXXXX"
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60 placeholder:text-slate-300 tracking-wide pr-24"
                  />
                  {isEdit && isValidPHNumber(normalizePhoneInput(localEditData.phone)) && (
                    <button
                      type="button"
                      onClick={sendFirebasePhoneOtp}
                      disabled={phoneOtpLoading}
                      className="absolute bottom-2 right-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {phoneOtpLoading ? "Sending..." : (phoneOtpSent ? "OTP Sent" : "Send OTP")}
                    </button>
                  )}
                </div>
                {isEdit && phoneError && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">{phoneError}</p>
                )}
                {isEdit && phoneOtpVerified && !phoneError && (
                  <p className="mt-2 text-[10px] font-bold text-emerald-600">Phone verified.</p>
                )}
                {isEdit && !phoneError && localEditData.phone && (
                  <p className="mt-2 text-[10px] text-slate-400">PH format only. +639XXXXXXXXX will be saved as 09XXXXXXXXX.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-fit">
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
