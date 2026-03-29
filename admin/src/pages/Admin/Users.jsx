import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  ChevronLeft,
  ChevronRight,
  Search, 
  User, 
  UserPlus,
  Mail, 
  Shield,
  CircleDot,
  XCircle,
  RefreshCcw,
  Phone,
  PenBox
} from "lucide-react";
import FilterDropdown from "../../components/Admin/FilterDropdown";
import AddStaff from "./AddStaff";

const USERS_PER_PAGE = 5;
const normalizeUserRole = (role) => (role === "user" ? "guest" : role || "guest");

const Users = () => {
  const { aToken, allUsers, getAllUsers, changeUserStatus } = useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [adminInfo, setAdminInfo] = useState({ id: "" });
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (aToken) getAllUsers();
  }, [aToken]); 

  useEffect(() => {
    if (aToken) {
        try {
            const payload = JSON.parse(atob(aToken.split(".")[1]));
            setAdminInfo({ id: payload.id || "" });
        } catch (e) {
            setAdminInfo({ id: "" });
        }
    }
  }, [aToken]);

  const getFullName = (u) => {
    if (u.firstName) {
      const middle = u.middleName ? `${u.middleName} ` : '';
      return `${u.firstName} ${middle}${u.lastName}`.trim();
    }
    return u.name || "Unknown User";
  };

  const getDisplayPhone = (value) => {
    const normalized = String(value || "").trim();
    return normalized && normalized !== "0000000000" ? normalized : "";
  };

  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setShowAddStaffModal(true);
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setShowAddStaffModal(true);
  };

  const handleCloseStaffModal = () => {
    setShowAddStaffModal(false);
    setEditingStaff(null);
  };

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(allUsers) ? allUsers : [];
    const mappedUsers = users.map((u) => ({
      ...u,
      role: normalizeUserRole(u.role),
      isYou: Boolean(adminInfo.id) && String(u._id) === String(adminInfo.id),
    }));
    const adminUsers = mappedUsers.filter((u) => u.role === "admin");
    const primaryAdmin = adminUsers.find((u) => u.isYou) || adminUsers[0] || null;
    const merged = [
      ...(primaryAdmin ? [primaryAdmin] : []),
      ...mappedUsers.filter((u) => u.role !== "admin"),
    ];
    
    // Sort logic mapping
    const rolePriority = { admin: 1, staff: 2, guest: 3 };

    const filtered = merged.filter((u) => {
      const fullName = getFullName(u).toLowerCase();
      const matchSearch = !search || 
        fullName.includes(search.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === "all" || u.role === roleFilter;

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = !u.disabled;
      if (statusFilter === "disabled") matchStatus = u.disabled;

      return matchSearch && matchRole && matchStatus;
    });

    // ✅ UPDATED SORTING LOGIC: Role Priority first, then Alphabetical within roles
    return filtered.sort((a, b) => {
      const priorityA = rolePriority[a.role] || 4;
      const priorityB = rolePriority[b.role] || 4;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      const nameA = getFullName(a).toLowerCase();
      const nameB = getFullName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });

  }, [adminInfo.id, allUsers, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const visiblePageCount = Math.min(3, totalPages);
  const halfVisiblePageCount = Math.floor(visiblePageCount / 2);
  let visiblePageStart = Math.max(1, currentPageSafe - halfVisiblePageCount);
  let visiblePageEnd = visiblePageStart + visiblePageCount - 1;

  if (visiblePageEnd > totalPages) {
    visiblePageEnd = totalPages;
    visiblePageStart = Math.max(1, visiblePageEnd - visiblePageCount + 1);
  }

  const visiblePageNumbers = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, index) => visiblePageStart + index
  );
  const displayedUsers = filteredUsers.slice(
    (currentPageSafe - 1) * USERS_PER_PAGE,
    currentPageSafe * USERS_PER_PAGE
  );
  const visibleUserStart =
    filteredUsers.length === 0 ? 0 : (currentPageSafe - 1) * USERS_PER_PAGE + 1;
  const visibleUserEnd = Math.min(
    currentPageSafe * USERS_PER_PAGE,
    filteredUsers.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "staff", label: "Staff", icon: Shield },
    { value: "guest", label: "Guest", icon: User },
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active", icon: CircleDot },
    { value: "disabled", label: "Disabled", icon: XCircle }, 
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 font-sans text-slate-900">
      
      {/* TOP BAR */}
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Users</h1>
                <p className="text-slate-500 text-sm font-medium">Manage system access and roles.</p>
            </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAddStaff}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-black sm:w-auto"
        >
          <UserPlus size={18} />
          Add Staff
        </button>
      </div>

      {/* CONTROL BAR */}
      <div className="mb-6">
        <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
          <div className="relative w-full lg:w-[30rem] xl:w-[34rem] group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto z-10">
            <FilterDropdown
              label="Role"
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              icon={Shield}
              showLabelPrefix
              neutralValue="all"
              triggerClassName="w-full justify-between bg-slate-50 sm:w-auto sm:min-w-[140px]"
              menuClassName="w-full sm:w-52"
            />
            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={CircleDot}
              showLabelPrefix
              neutralValue="all"
              triggerClassName="w-full justify-between bg-slate-50 sm:w-auto sm:min-w-[140px]"
              menuClassName="w-full sm:w-52"
            />
            {(roleFilter !== "all" || statusFilter !== "all" || search) && (
              <button 
                onClick={() => {setSearch(""); setRoleFilter("all"); setStatusFilter("all");}}
                className="w-full rounded-[16px] bg-rose-50 px-3 py-2 text-[11px] font-normal text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-700 sm:w-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 md:hidden">
          {displayedUsers.length > 0 ? (
            displayedUsers.map((u) => {
              const isAdminRow = u.role === "admin";
              const displayPhone = getDisplayPhone(u.phone);

              return (
                <div
                  key={u._id}
                  className={`rounded-2xl border px-4 py-4 shadow-sm transition-colors ${
                    u.disabled
                      ? "border-slate-200 bg-slate-50/80"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 ${
                        u.disabled ? "grayscale opacity-70" : ""
                      }`}
                    >
                      {isAdminRow ? (
                        <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
                          <Shield size={18} />
                        </div>
                      ) : u.image ? (
                        <img src={u.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                          <User size={18} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-bold ${u.disabled ? "text-slate-400" : "text-slate-900"}`}>
                          {isAdminRow ? "Administrator" : getFullName(u)}
                        </p>
                        {u.isYou && (
                          <span className="rounded uppercase bg-indigo-50 px-1.5 py-0.5 text-[9px] tracking-wider text-indigo-600">
                            You
                          </span>
                        )}
                      </div>

                      {!isAdminRow && (
                        <div className="mt-2 space-y-1.5">
                          <div className={`flex items-start gap-2 text-xs ${u.disabled ? "text-slate-400" : "text-slate-500"}`}>
                            <Mail size={14} className="mt-0.5 shrink-0 text-slate-400 opacity-70" />
                            <span className="break-all">{u.email || "No Email"}</span>
                          </div>
                          {displayPhone && (
                            <div className={`flex items-start gap-2 text-xs ${u.disabled ? "text-slate-400" : "text-slate-500"}`}>
                              <Phone size={14} className="mt-0.5 shrink-0 text-slate-400 opacity-70" />
                              <span>{displayPhone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      u.role === "admin"
                        ? "border-rose-100 bg-rose-50 text-rose-600"
                        : u.role === "staff"
                          ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}>
                      {u.role === "guest" ? "Guest" : u.role || "User"}
                    </span>

                    {!isAdminRow && (
                      u.disabled ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          <XCircle size={12} /> Disabled
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                          <CircleDot size={12} className="animate-pulse" /> Active
                        </div>
                      )
                    )}
                  </div>

                  {!u.isYou && u.role !== "admin" && (
                    <div className={`mt-4 grid gap-2 ${u.role === "staff" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        onClick={() => changeUserStatus(u._id)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition-all ${
                          u.disabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            : "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {u.disabled ? <RefreshCcw size={14} /> : <Shield size={14} />}
                        {u.disabled ? "Enable Account" : "Disable Account"}
                      </button>
                      {u.role === "staff" && (
                        <button
                          onClick={() => handleEditStaff(u)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-900 shadow-sm transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                        >
                          <PenBox size={14} />
                          Edit Staff
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm font-medium text-slate-500">
              No users found match your criteria.
            </div>
          )}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Profile</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Info</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedUsers.length > 0 ? (
                displayedUsers.map((u) => {
                const isAdminRow = u.role === 'admin';

                const displayPhone = getDisplayPhone(u.phone);

                return (
                <tr key={u._id} className={`group transition-colors ${u.disabled ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 relative ${u.disabled ? 'grayscale opacity-70' : ''}`}>
                          {isAdminRow ? (
                            <div className="bg-slate-900 w-full h-full flex items-center justify-center text-white">
                              <Shield size={16} />
                            </div>
                          ) : u.image ? (
                            <img src={u.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400"><User size={16}/></div>
                          )}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${u.disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                            {isAdminRow ? "Administrator" : getFullName(u)} 
                            {u.isYou && <span className="ml-1.5 text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
  {isAdminRow ? null : (
  <div className="flex flex-col gap-1.5">
    {/* Email */}
    <div className={`flex items-center gap-2 text-sm ${u.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
      <Mail size={14} className="text-slate-400 opacity-70"/> 
      <span className="truncate max-w-[280px]">
        {u.email || <span className="italic text-slate-300">No Email</span>}
      </span>
    </div>
    
    {displayPhone && (
      <div className={`flex items-center gap-2 text-sm ${u.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
        <Phone size={14} className="text-slate-400 opacity-70"/> 
        <span className="truncate max-w-[280px]">{displayPhone}</span>
      </div>
    )}
  </div>
  )}
</td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        u.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        u.role === 'staff' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {u.role === 'guest' ? 'Guest' : u.role || 'User'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {isAdminRow ? null : u.disabled ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <XCircle size={12} /> Disabled
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold uppercase tracking-wider">
                          <CircleDot size={12} className="animate-pulse" /> Active
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {!u.isYou && u.role !== 'admin' && (
                          <>
                            <button 
                                onClick={() => changeUserStatus(u._id)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                                  u.disabled 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                    : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
                                }`}
                            >
                                {u.disabled ? <RefreshCcw size={14}/> : <Shield size={14}/>}
                                {u.disabled ? "Enable" : "Disable"}
                            </button>
                            {u.role === "staff" && (
                              <button
                                onClick={() => handleEditStaff(u)}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                              >
                                <PenBox size={14} />
                                Edit
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                </tr>
            )})
            ) : (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500 font-medium">No users found match your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {filteredUsers.length > 0 && (
          <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full text-left sm:w-auto">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
                User Directory
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
                Showing {visibleUserStart}-{visibleUserEnd} of {filteredUsers.length} users
              </p>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPageSafe === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {visiblePageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[9px] font-bold transition ${
                        currentPageSafe === page
                          ? "bg-slate-900 text-white shadow-md"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddStaffModal && (
        <AddStaff
          onClose={handleCloseStaffModal}
          getAllUsers={getAllUsers}
          editData={editingStaff}
        />
      )}
    </div>
  );
};

export default Users;
