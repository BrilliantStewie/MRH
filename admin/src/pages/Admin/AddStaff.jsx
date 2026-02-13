import React, { useContext, useState, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  X, 
  User, 
  Mail, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Lock 
} from "lucide-react";
import { toast } from "react-toastify";

// ✅ VALIDATION LOGIC
const TEXT_SUFFIXES = ["Jr.", "Sr."];
const ROMAN_REGEX = /^C$|^(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

const AddStaff = ({ onClose, getAllUsers, editData = null }) => {
  const { createStaff, updateStaff, allStaff } = useContext(AdminContext);
  const [loading, setLoading] = useState(false);
  const isEdit = !!editData;

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  
  const [suffix, setSuffix] = useState(""); 
  const [suffixError, setSuffixError] = useState(""); 

  const [image, setImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState("");
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (editData) {
      if (editData.firstName) {
          setFirstName(editData.firstName);
          setLastName(editData.lastName);
          setMiddleName(editData.middleName || "");
          setSuffix(editData.suffix || "");
      } else {
          const nameParts = (editData.name || "").split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
      }
      
      setFormData(prev => ({ 
        ...prev, 
        email: editData.email || "", 
        phone: editData.phone || "",
        password: "", 
        confirmPassword: ""
      }));
      
      if (editData.image) {
        setPreviewUrl(editData.image);
        setIsImageRemoved(false);
      }
    }
  }, [editData]);

  const generateUniqueEmail = (fName, lName) => {
    if (!fName || !lName) return "";
    const basePrefix = `${fName.toLowerCase().replace(/[\s-]/g, "")}.${lName.toLowerCase().replace(/[\s-]/g, "")}`;
    const domain = "@mrh.com";
    
    const existingEmails = (allStaff || [])
      .map(staff => staff.email.toLowerCase())
      .filter(email => email.startsWith(basePrefix));

    if (existingEmails.length === 0) return `${basePrefix}${domain}`;

    let maxSuffix = 0;
    existingEmails.forEach(email => {
      const namePart = email.split('@')[0];
      const suffixNum = namePart.replace(basePrefix, "");
      if (suffixNum === "") maxSuffix = Math.max(maxSuffix, 0);
      else {
        const num = parseInt(suffixNum);
        if (!isNaN(num)) maxSuffix = Math.max(maxSuffix, num);
      }
    });

    return `${basePrefix}${maxSuffix + 1}${domain}`;
  };

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === "suffix") {
        formatted = value.replace(/[^a-zA-Z.]/g, "");
        if (formatted.length > 0) {
            const isRoman = /^[IVX]+$/i.test(formatted);
            if (isRoman) formatted = formatted.toUpperCase();
            else formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        setSuffix(formatted);

        if (formatted === "") setSuffixError("");
        else if (TEXT_SUFFIXES.includes(formatted)) setSuffixError("");
        else if (ROMAN_REGEX.test(formatted)) setSuffixError("");
        else setSuffixError("Invalid Suffix");

    } else {
        formatted = value.replace(/[^a-zA-Z-\s]/g, "").replace(/\b\w/g, c => c.toUpperCase());
        if (name === "firstName") setFirstName(formatted);
        else if (name === "lastName") setLastName(formatted);
        else if (name === "middleName") setMiddleName(formatted);
    }

    if (!isEdit && (name === "firstName" || name === "lastName")) {
      const f = name === "firstName" ? formatted : firstName;
      const l = name === "lastName" ? formatted : lastName;
      setFormData(p => ({ ...p, email: generateUniqueEmail(f, l) }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsImageRemoved(false);
    }
  };

  const handleRemoveImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImage(null);
    setPreviewUrl("");
    setIsImageRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !formData.phone) return toast.error("Please fill all required fields");
    if (suffixError) return toast.error("Invalid suffix.");
    
    // ✅ Password validation for both Add and Edit
    if (formData.password !== formData.confirmPassword) {
        return toast.error("Passwords do not match");
    }
    
    if (!isEdit && !formData.password) {
        return toast.error("Password is required for new accounts");
    }

    setLoading(true);
    
    const data = new FormData();
    data.append("firstName", firstName);
    data.append("lastName", lastName);
    if (middleName) data.append("middleName", middleName);
    if (suffix) data.append("suffix", suffix);
    data.append("position", "Staff"); 
    data.append("phone", formData.phone);
    data.append("email", formData.email);
    
    if (image) data.append("image", image);
    else if (isImageRemoved) data.append("removeImage", "true");
    
    // ✅ PASSING THE NEW PASSWORD
    // If isEdit is true and password is filled, the backend will update it and terminate sessions.
    if (formData.password) {
        data.append("password", formData.password);
    }

    try {
      const success = isEdit ? await updateStaff(editData._id, data) : await createStaff(data);
      if (success) {
        await getAllUsers();
        toast.success(isEdit && formData.password 
            ? "Staff updated. Password change will log them out." 
            : "Staff saved successfully");
        onClose();
      }
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-up max-h-[90vh]">
        
        {/* LEFT COLUMN */}
        <div className="w-full md:w-[320px] bg-slate-900 text-white p-8 flex flex-col items-center justify-center text-center relative shrink-0">
          <button onClick={onClose} className="absolute top-4 left-4 md:hidden p-2 bg-white/10 rounded-full"><X size={20} /></button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Profile" : "New Account"}</h2>
            <p className="text-slate-400 text-sm mt-1">Staff Access Control</p>
          </div>

          <div className="mb-6 relative group">
            <label className="cursor-pointer block w-40 h-40 rounded-full border-4 border-slate-700 bg-slate-800 overflow-hidden shadow-2xl hover:border-slate-500 transition-colors relative">
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" alt="Profile" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 group-hover:text-slate-400 transition-colors"><User size={48} className="mb-2" /><span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Upload</span></div>}
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </label>
            {previewUrl && <button onClick={handleRemoveImage} className="absolute top-0 right-0 translate-x-1 -translate-y-1 bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:bg-red-600 hover:scale-105 transition-all z-10 border-2 border-slate-900"><Trash2 size={16} /></button>}
          </div>

          <div className="bg-slate-800/50 px-4 py-3 rounded-xl w-full border border-slate-700">
             <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1"><Mail size={12} /> Email Address</div>
             <p className="text-sm font-mono text-indigo-300 truncate">{formData.email || "waiting for names..."}</p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 bg-white flex flex-col relative">
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-300 hover:text-slate-600 transition-colors hidden md:block"><X size={24} /></button>

          <div className="p-8 md:p-10 overflow-y-auto scrollbar-hide flex-1">
             <form id="split-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Names */}
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Personal Details</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-slate-600">First Name <span className="text-red-500">*</span></label>
                         <input name="firstName" value={firstName} onChange={handleNameChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all" placeholder="John" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-slate-600">Last Name <span className="text-red-500">*</span></label>
                         <input name="lastName" value={lastName} onChange={handleNameChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all" placeholder="Doe" />
                      </div>
                   </div>

                   <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3 space-y-1">
                         <label className="text-xs font-semibold text-slate-600">Middle Name</label>
                         <input name="middleName" value={middleName} onChange={handleNameChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all" placeholder="Optional" />
                      </div>
                      <div className="col-span-1 space-y-1 relative">
                         <label className="text-xs font-semibold text-slate-600 flex justify-between">Suffix</label>
                         <input name="suffix" maxLength={8} value={suffix} onChange={handleNameChange} className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${suffixError ? "border-red-500 bg-red-50" : "bg-slate-50 border-slate-200"}`} placeholder="Jr." />
                      </div>
                   </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Contact Info</h3>
                   <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Mobile Number <span className="text-red-500">*</span></label>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+63</span>
                         <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 11)})} className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all" placeholder="912 345 6789" />
                      </div>
                   </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security</h3>
                      {isEdit && <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded italic shadow-sm border border-amber-100">
                        <AlertCircle size={10} /> Changing this will log out the staff member
                      </div>}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-slate-600">New Password {!isEdit && <span className="text-red-500">*</span>}</label>
                         <div className="relative">
                            <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all pr-10" placeholder="••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-slate-600 flex justify-between">
                            <span>Confirm {!isEdit && <span className="text-red-500">*</span>}</span>
                            {formData.confirmPassword && (<span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${formData.password === formData.confirmPassword ? "text-emerald-500" : "text-rose-500"}`}>{formData.password === formData.confirmPassword ? <>Match <CheckCircle2 size={10} /></> : <>Mismatch <AlertCircle size={10} /></>}</span>)}
                         </label>
                         <div className="relative">
                            <input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-sm outline-none transition-all pr-10 ${!formData.confirmPassword ? "border-slate-200" : formData.password === formData.confirmPassword ? "border-emerald-500 bg-emerald-50/30" : "border-rose-500 bg-rose-50/30"}`} placeholder="••••••" />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                         </div>
                      </div>
                   </div>
                </div>
             </form>
          </div>

          <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
             <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
             <button type="submit" form="split-form" disabled={loading} className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all flex items-center gap-2 ${isEdit ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                {loading ? "Processing..." : (isEdit ? "Update Staff" : "Create Account")}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStaff;