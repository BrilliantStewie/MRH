import React, { useContext, useState, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { X, User, Mail, Phone, Lock, BadgeCheck, Info, Camera } from "lucide-react";
import { toast } from "react-toastify";

const AddStaff = ({ onClose, getAllUsers }) => {
  const { createStaff } = useContext(AdminContext);
  const [loading, setLoading] = useState(false);

  // --- STATE MANAGEMENT ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Image State
  const [image, setImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const [formData, setFormData] = useState({
    email: "", // Auto-generated
    phone: "",
    password: "",
  });

  // --- HANDLERS ---

  // 1. Handle Image Upload & Preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 2. Handle Name Changes & Auto-Email Generation
  const handleNameChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "firstName") {
      setFirstName(value);
      
      // LOGIC: Lowercase + Trim + Replace spaces with "_"
      // Example: "Juan Pedro" -> "juan_pedro"
      const cleanName = value
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")          
          .replace(/[^a-z0-9_]/g, "");   

      setFormData(prev => ({
        ...prev,
        email: cleanName ? `${cleanName}.mrh_staff@gmail.com` : ""
      }));
    } else {
      setLastName(value);
    }
  };

  // 3. Handle Other Inputs (Phone, Password)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validations
    if (!firstName || !lastName) {
      toast.error("Please enter both First and Last name.");
      setLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
       toast.error("Invalid Email generation.");
       setLoading(false);
       return;
    }

    // Prepare FormData (Required for File Uploads)
    const formDataToSend = new FormData();
    formDataToSend.append("name", `${firstName} ${lastName}`.trim());
    formDataToSend.append("email", formData.email);
    formDataToSend.append("phone", formData.phone);
    formDataToSend.append("password", formData.password);
    formDataToSend.append("role", "staff"); // Hardcoded role
    
    if (image) {
      formDataToSend.append("image", image);
    }

    // Call API
    const success = await createStaff(formDataToSend);
    
    if (success) {
      toast.success("Staff member added successfully!");
      getAllUsers();
      onClose();
    } else {
      setLoading(false);
    }
  };

  // Cleanup Preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Dimmed Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Main Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">New Staff Registration</h2>
            <p className="text-sm text-slate-500 mt-0.5">Enter details. Profile picture is optional.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <form id="staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 📸 PROFILE PICTURE UPLOAD AREA */}
            <div className="md:col-span-2 flex justify-center mb-2">
              <div className="relative group">
                <input 
                  type="file" 
                  id="profile-pic" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
                
                {/* Image Preview or Placeholder */}
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center relative">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-slate-300" />
                  )}
                  
                  {/* Overlay on Hover */}
                  <label 
                    htmlFor="profile-pic" 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium"
                  >
                    Change
                  </label>
                </div>

                {/* Camera Badge */}
                <label 
                  htmlFor="profile-pic"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md cursor-pointer hover:bg-blue-700 transition-colors border-2 border-white"
                >
                  <Camera size={14} />
                </label>
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">First Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  name="firstName" 
                  required 
                  value={firstName} 
                  onChange={handleNameChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. Juan Pedro"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Last Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  name="lastName" 
                  required 
                  value={lastName} 
                  onChange={handleNameChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. Dela Cruz"
                />
              </div>
            </div>

            {/* Email (Auto-Generated & Read-Only) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                Email Address 
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-normal normal-case flex items-center gap-1">
                  <Info size={10} /> Auto-Generated
                </span>
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  name="email" 
                  readOnly 
                  value={formData.email} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed rounded-lg outline-none transition-all text-sm font-medium"
                  placeholder="First name required..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={14} />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Contact Number</label>
              <div className="relative group">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  name="phone" 
                  required 
                  value={formData.phone} 
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="+63 900 000 0000"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Temporary Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="password" 
                  name="password" 
                  required 
                  value={formData.password} 
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="Create password"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="staff-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            {loading ? "Processing..." : <><BadgeCheck size={18} /> Confirm Registration</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddStaff;