import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import {
  CircleDot,
  ChevronLeft,
  ChevronRight,
  Mail,
  PenBox,
  Phone,
  RefreshCcw,
  Search,
  Shield,
  User,
  UserPlus,
  XCircle,
} from "lucide-react";
import AddStaff from "./AddStaff";

const STAFF_PER_PAGE = 5;

const StaffList = () => {
  const { aToken, allUsers, getAllUsers, changeUserStatus } =
    useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (aToken) getAllUsers();
  }, [aToken]);

  const getFullName = (user) => {
    if (user.firstName) {
      const middle = user.middleName ? `${user.middleName} ` : "";
      const suffix = user.suffix ? ` ${user.suffix}` : "";
      return `${user.firstName} ${middle}${user.lastName}${suffix}`.trim();
    }
    return user.name || "Unknown Staff";
  };

  const handleEdit = (staffMember) => {
    setEditData(staffMember);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditData(null);
  };

  const toggleStatus = async (userId) => {
    const result = await changeUserStatus(userId);
    if (result) getAllUsers();
  };

  const staffList = useMemo(() => {
    const users = Array.isArray(allUsers) ? allUsers : [];
    const searchTerm = search.toLowerCase().trim();

    const filtered = users.filter((user) => {
      if (user.role !== "staff") return false;
      if (!searchTerm) return true;

      const firstName = (user.firstName || "").toLowerCase();
      const lastName = (user.lastName || "").toLowerCase();
      const middleName = (user.middleName || "").toLowerCase();
      const suffix = (user.suffix || "").toLowerCase();
      const email = (user.email || "").toLowerCase();

      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        middleName.includes(searchTerm) ||
        suffix.includes(searchTerm) ||
        email.includes(searchTerm)
      );
    });

    return filtered.sort((a, b) =>
      (a.firstName || "").toLowerCase().localeCompare((b.firstName || "").toLowerCase())
    );
  }, [allUsers, search]);

  const totalPages = Math.max(1, Math.ceil(staffList.length / STAFF_PER_PAGE));
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
  const displayedStaff = staffList.slice(
    (currentPageSafe - 1) * STAFF_PER_PAGE,
    currentPageSafe * STAFF_PER_PAGE
  );
  const visibleStaffStart =
    staffList.length === 0 ? 0 : (currentPageSafe - 1) * STAFF_PER_PAGE + 1;
  const visibleStaffEnd = Math.min(
    currentPageSafe * STAFF_PER_PAGE,
    staffList.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            Staff Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage admin access and staff accounts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-black"
        >
          <UserPlus size={18} />
          Add Staff
        </button>
      </div>

      <div className="mb-7">
        <div className="relative w-full max-w-lg">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name, email, or suffix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 uppercase text-[11px] tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-5 font-black">Staff Member</th>
                <th className="px-6 py-5 font-black">Contact Info</th>
                <th className="px-6 py-5 text-center font-black">Status</th>
                <th className="px-6 py-5 text-right font-black">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayedStaff.map((staffMember) => (
                <tr
                  key={staffMember._id}
                  className={`group transition-colors ${
                    staffMember.disabled
                      ? "bg-slate-50/80"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-inner ${
                          staffMember.disabled ? "grayscale opacity-70" : ""
                        }`}
                      >
                        {staffMember.image && staffMember.image.trim() !== "" ? (
                          <img
                            src={staffMember.image}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <User size={22} className="text-slate-400" />
                        )}
                      </div>

                      <div>
                        <span
                          className={`text-sm font-bold ${
                            staffMember.disabled
                              ? "text-slate-400"
                              : "text-slate-900"
                          }`}
                        >
                          {getFullName(staffMember)}
                        </span>
                        <div className="text-xs capitalize text-slate-500">
                          {staffMember.role}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          staffMember.disabled
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        <Mail size={14} className="text-slate-400" />
                        {staffMember.email}
                      </div>
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          staffMember.disabled
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        <Phone size={14} className="text-slate-400" />
                        {staffMember.phone || "N/A"}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {staffMember.disabled ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <XCircle size={12} />
                        Disabled
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        <CircleDot size={12} className="animate-pulse" />
                        Active
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 transition-all duration-200 group-hover:opacity-100">
                      <button
                        onClick={() => toggleStatus(staffMember._id)}
                        className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                          staffMember.disabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            : "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                        title={
                          staffMember.disabled
                            ? "Enable Account"
                            : "Disable Account"
                        }
                      >
                        {staffMember.disabled ? (
                          <RefreshCcw size={14} />
                        ) : (
                          <Shield size={14} />
                        )}
                        <span className="hidden lg:inline">
                          {staffMember.disabled ? "Enable" : "Disable"}
                        </span>
                      </button>

                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                        title="Edit Details"
                      >
                        <span className="flex items-center gap-1">
                          <PenBox size={16} />
                          <span className="hidden lg:inline">Edit</span>
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!staffList.length && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <User size={40} className="opacity-20" />
                      <p>No staff members found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {staffList.length > 0 && (
          <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full text-left sm:w-auto">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Staff Directory
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
                Showing {visibleStaffStart}-{visibleStaffEnd} of {staffList.length} staff members
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

      {showAddModal && (
        <AddStaff
          onClose={handleCloseModal}
          getAllUsers={getAllUsers}
          editData={editData}
        />
      )}
    </div>
  );
};

export default StaffList;
