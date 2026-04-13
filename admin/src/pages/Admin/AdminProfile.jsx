import React, { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  CheckCircle,
  Edit3,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Mail,
  Save,
  User,
  UserCircle,
} from "lucide-react";
import { AdminContext } from "../../context/AdminContext";
import ProfileNameChangeDialog from "../../components/ProfileNameChangeDialog";

const NAME_INPUT_REGEX = /[^a-zA-Z\u00D1\u00F1.'\s-]/g;
const NAME_CAPITALIZE_REGEX = /(^|[\s\-'.])([a-z\u00f1])/g;

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  email: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const buildFullName = ({ firstName = "", middleName = "", lastName = "", suffix = "" } = {}) =>
  [firstName, middleName, lastName, suffix]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

const formatPersonName = (value) =>
  String(value || "")
    .replace(NAME_INPUT_REGEX, "")
    .toLowerCase()
    .replace(NAME_CAPITALIZE_REGEX, (_, separator, character) => `${separator}${character.toUpperCase()}`);

const romanToInt = (value) => {
  if (!value) return 0;
  const map = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  const str = value.toLowerCase();
  let result = 0;

  for (let i = 0; i < str.length; i += 1) {
    const curr = map[str[i]];
    const next = map[str[i + 1]];
    result += next && curr < next ? -curr : curr;
  }

  return result;
};

const isSuffixInputAllowed = (value) => {
  if (!value) return true;
  if (!/^[a-zA-Z.]+$/.test(value)) return false;
  if ((value.match(/\./g) || []).length > 1) return false;

  const clean = value.trim().toLowerCase().replace(/\./g, "");
  const wordOptions = ["jr", "sr", "junior", "senior"];
  if (wordOptions.some((option) => option.startsWith(clean))) return true;

  if (/^[ivxlc]+$/.test(clean)) {
    const validRomanStructure = /^c$|^(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
    if (validRomanStructure.test(clean)) {
      const romanValue = romanToInt(clean);
      return romanValue > 0 && romanValue <= 100;
    }
  }

  return false;
};

const formatSuffixValue = (value) => {
  if (!value) return "";
  const clean = value.trim().toLowerCase().replace(/\./g, "");
  return /^[ivxlc]+$/.test(clean)
    ? value.toUpperCase()
    : value.charAt(0).toUpperCase() + value.slice(1);
};

const AdminProfile = () => {
  const { adminData, updateAdminProfile, backendUrl } = useContext(AdminContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [suffixError, setSuffixError] = useState("");
  const [showNameChangeConfirm, setShowNameChangeConfirm] = useState(false);

  useEffect(() => {
    if (!adminData || isEdit) return;

    setFormData({
      firstName: adminData.firstName || "",
      middleName: adminData.middleName || "",
      lastName: adminData.lastName || "",
      suffix: adminData.suffix || "",
      email: normalizeEmail(adminData.email),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setSuffixError("");
    setShowNameChangeConfirm(false);
    setIsUpdating(false);
  }, [adminData, isEdit]);

  const trimmedFirstName = formData.firstName.trim();
  const trimmedMiddleName = formData.middleName.trim();
  const trimmedLastName = formData.lastName.trim();
  const trimmedSuffix = formData.suffix.trim();
  const normalizedEmail = normalizeEmail(formData.email);
  const originalEmail = normalizeEmail(adminData?.email);
  const emailChanged = normalizedEmail !== originalEmail;
  const wantsPasswordChange = Boolean(formData.newPassword);
  const currentFullName = useMemo(
    () =>
      buildFullName({
        firstName: adminData?.firstName,
        middleName: adminData?.middleName,
        lastName: adminData?.lastName,
        suffix: adminData?.suffix,
      }) || "Administrator",
    [adminData]
  );
  const formattedFullName =
    buildFullName({
      firstName: trimmedFirstName,
      middleName: trimmedMiddleName,
      lastName: trimmedLastName,
      suffix: trimmedSuffix,
    }) || "Administrator";
  const nameChanged =
    trimmedFirstName !== String(adminData?.firstName || "").trim() ||
    trimmedMiddleName !== String(adminData?.middleName || "").trim() ||
    trimmedLastName !== String(adminData?.lastName || "").trim() ||
    trimmedSuffix !== String(adminData?.suffix || "").trim();
  const hasPendingChanges = nameChanged || emailChanged || wantsPasswordChange;
  const isSuffixFilled = trimmedSuffix.length > 0 && !suffixError;
  const roleLabel = String(adminData?.role || "admin").trim();
  const formattedRoleLabel = roleLabel
    ? roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)
    : "Admin";
  const displayImage = adminData?.image
    ? adminData.image.startsWith("http")
      ? adminData.image
      : `${backendUrl}/${adminData.image}`
    : "";

  const resetForm = () => {
    setFormData({
      firstName: adminData?.firstName || "",
      middleName: adminData?.middleName || "",
      lastName: adminData?.lastName || "",
      suffix: adminData?.suffix || "",
      email: normalizeEmail(adminData?.email),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setSuffixError("");
    setShowNameChangeConfirm(false);
    setShowPassword({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  const handleDiscard = () => {
    resetForm();
    setIsEdit(false);
  };

  const handleSave = async ({ skipNameConfirm = false } = {}) => {
    if (!trimmedFirstName || !trimmedLastName) {
      toast.error("First name and last name are required.");
      return;
    }

    if (!normalizedEmail) {
      toast.error("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (suffixError) {
      toast.error("Please fix the suffix format.");
      return;
    }

    if (!hasPendingChanges) {
      toast.info("No changes to save.");
      return;
    }

    if ((emailChanged || wantsPasswordChange) && !formData.currentPassword) {
      toast.error("Current password is required.");
      return;
    }

    if (wantsPasswordChange && formData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (wantsPasswordChange && formData.newPassword !== formData.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    if (nameChanged && !skipNameConfirm) {
      setShowNameChangeConfirm(true);
      return;
    }

    setIsUpdating(true);

    const response = await updateAdminProfile({
      firstName: trimmedFirstName,
      middleName: trimmedMiddleName,
      lastName: trimmedLastName,
      suffix: trimmedSuffix,
      email: normalizedEmail,
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    setIsUpdating(false);

    if (!response?.success) {
      return;
    }

    resetForm();
    setIsEdit(false);
  };

  if (!adminData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-3 sm:p-4 xl:p-5">
      <ProfileNameChangeDialog
        open={showNameChangeConfirm}
        currentName={currentFullName}
        nextName={formattedFullName}
        impactText="This updated name will appear across your admin profile, notifications, review replies, and admin activity records."
        isLoading={isUpdating}
        onClose={() => setShowNameChangeConfirm(false)}
        onConfirm={async () => {
          setShowNameChangeConfirm(false);
          await handleSave({ skipNameConfirm: true });
        }}
      />

      <div className="w-full space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="relative h-32 bg-[#0F172A]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-[#1e1b4b] opacity-90"></div>
          </div>

          <div className="-mt-14 flex flex-col gap-6 px-8 pb-8 md:flex-row md:items-end">
            <div className="group relative shrink-0">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-slate-100 shadow-lg transition-transform duration-300 group-hover:scale-105">
                {displayImage ? (
                  <img src={displayImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" strokeWidth={1.5} />
                )}
              </div>
            </div>

            <div className="mb-2 min-w-0 flex-grow -translate-y-6 md:-translate-y-5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 max-w-full break-words text-2xl font-bold leading-tight tracking-tight text-slate-900">
                  {formattedFullName}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
                  {formattedRoleLabel}
                </span>
              </div>
            </div>

            <div className="mb-2">
              {!isEdit ? (
                <button
                  type="button"
                  onClick={() => setIsEdit(true)}
                  className="flex items-center gap-2 rounded-xl bg-[#0F172A] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black active:scale-95"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-800"
                    disabled={isUpdating}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isUpdating || !trimmedFirstName || !trimmedLastName || Boolean(suffixError)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex h-full flex-col rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm lg:col-span-2">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <UserCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Account Details</h2>
                <p className="text-xs font-medium text-slate-400">
                  Manage your personal identifying information.
                </p>
              </div>
            </div>

            <div className="grid flex-grow grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-4">
              {!isEdit ? (
                <div className="md:col-span-4">
                  <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <User size={14} className="text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">{formattedFullName}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 md:col-span-4 md:p-6">
                  <div className="space-y-4 md:space-y-5">
                    <div>
                      <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        First Name
                      </label>
                      <div
                        className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all ${
                          trimmedFirstName
                            ? "border-slate-200 focus-within:border-blue-500"
                            : "border-red-300 focus-within:border-red-400"
                        }`}
                      >
                        <input
                          value={formData.firstName}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              firstName: formatPersonName(event.target.value),
                            }))
                          }
                          className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                          placeholder="First Name"
                        />
                      </div>
                      {!trimmedFirstName ? (
                        <p className="mt-2 text-[10px] font-bold text-red-500">First name is required.</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Middle Name (Optional)
                      </label>
                      <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-500">
                        <input
                          value={formData.middleName}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              middleName: formatPersonName(event.target.value),
                            }))
                          }
                          className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                          placeholder="Middle Name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.9fr)]">
                      <div>
                        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Last Name
                        </label>
                        <div
                          className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all ${
                            trimmedLastName
                              ? "border-slate-200 focus-within:border-blue-500"
                              : "border-red-300 focus-within:border-red-400"
                          }`}
                        >
                          <input
                            value={formData.lastName}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                lastName: formatPersonName(event.target.value),
                              }))
                            }
                            className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                            placeholder="Last Name"
                          />
                        </div>
                        {!trimmedLastName ? (
                          <p className="mt-2 text-[10px] font-bold text-red-500">Last name is required.</p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Suffix
                        </label>
                        <div
                          className={`group flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm transition-all ${
                            isSuffixFilled
                              ? "border border-green-300 bg-green-50"
                              : "border border-slate-200 bg-white focus-within:border-blue-500"
                          }`}
                        >
                          <input
                            value={formData.suffix}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (!isSuffixInputAllowed(nextValue)) {
                                setSuffixError("Use Jr./Sr. or Roman numerals (I-C).");
                                return;
                              }
                              setSuffixError("");
                              setFormData((prev) => ({
                                ...prev,
                                suffix: formatSuffixValue(nextValue),
                              }));
                            }}
                            className="w-full bg-transparent text-center text-sm font-bold text-slate-800 outline-none"
                          />
                          {isSuffixFilled ? <CheckCircle size={16} className="shrink-0 text-green-500" /> : null}
                        </div>
                        {suffixError ? (
                          <p className="mt-2 text-[10px] font-bold text-red-500">{suffixError}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Email Address
                </label>
                <div
                  className={`group flex items-center gap-3 rounded-xl border px-5 py-3.5 transition-all ${
                    isEdit ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <Mail size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit || isUpdating}
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none disabled:opacity-60"
                    placeholder="admin@example.com"
                    type="email"
                  />
                </div>
                <p className="mt-2 text-[10px] font-medium text-slate-400">
                  Current password is only required when changing your email or password.
                </p>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                  <Lock size={22} />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Security</h2>
              </div>

              {!isEdit ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                  <div className="mx-auto mb-3 inline-flex rounded-full bg-green-50 p-3 text-green-600 shadow-sm">
                    <CheckCircle size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Connection Secure</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    End-to-End Encrypted
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">Update Password</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                      Use your current password to set a new one.
                    </p>
                  </div>

                  {[
                    { key: "currentPassword", placeholder: "Current Password" },
                    { key: "newPassword", placeholder: "New Password (Optional)" },
                    { key: "confirmPassword", placeholder: "Confirm New Password" },
                  ].map(({ key, placeholder }) => (
                    <div className="group relative" key={key}>
                      <input
                        type={showPassword[key] ? "text" : "password"}
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 pr-12 text-[10px] font-black tracking-widest outline-none shadow-sm transition-all focus:border-blue-500"
                        value={formData[key]}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                        disabled={isUpdating}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                      >
                        {showPassword[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-slate-50 pt-6">
              <div className="flex items-start gap-2 italic text-slate-400">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p className="text-[10px] leading-relaxed">
                  Name changes update how you appear across admin tools, while password changes refresh your session automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
