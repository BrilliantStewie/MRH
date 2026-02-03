import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AdminContext } from "../../context/AdminContext";

const Users = () => {
  const { aToken, allUsers, getAllUsers } =
    useContext(AdminContext);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // 🔐 CURRENT ADMIN INFO FROM TOKEN
  const [adminInfo, setAdminInfo] = useState({
    email: "",
    isYou: false,
  });

  useEffect(() => {
    if (aToken) {
      getAllUsers();

      try {
        const payload = JSON.parse(
          atob(aToken.split(".")[1])
        );

        setAdminInfo({
          email: payload.email || "",
          isYou: payload.role === "admin",
        });
      } catch {
        setAdminInfo({
          email: "",
          isYou: false,
        });
      }
    }
  }, [aToken]);

  // 🔐 VIRTUAL ADMIN
  const adminUser = {
    _id: "admin",
    name: "System Administrator",
    email: adminInfo.email || "Admin",
    role: "admin",
    image: null,
    isYou: adminInfo.isYou,
  };

  // 🧠 MERGE ADMIN + DB USERS
  const mergedUsers = useMemo(() => {
    const users = Array.isArray(allUsers) ? allUsers : [];

    // prevent duplicate admin
    const filtered = users.filter(
      (u) => u.email !== adminUser.email
    );

    return [adminUser, ...filtered];
  }, [allUsers, adminUser.email]);

  // 🏷️ ROLE BADGE STYLE
  const roleBadge = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700 border-red-200";
      case "staff":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // 🔎 FILTER LOGIC
  const filteredUsers = useMemo(() => {
    return mergedUsers.filter((u) => {
      const matchSearch =
        !search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());

      const matchRole =
        roleFilter === "all" || u.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [mergedUsers, search, roleFilter]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">
        Users Management
      </h1>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl border mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="user">Guest</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 text-left">User</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-left">Role</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredUsers.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50">
                {/* USER + IMAGE */}
                <td className="px-6 py-4 flex items-center gap-3">
                  <img
                    src={
                      u.image ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(u.name)
                    }
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover border"
                  />

                  <p className="font-semibold">
                    {u.name}
                    {u.isYou && (
                      <span className="ml-2 text-xs text-blue-600 font-bold">
                        (You)
                      </span>
                    )}
                  </p>
                </td>

                <td className="px-6 py-4">
                  {u.email}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${roleBadge(
                      u.role
                    )}`}
                  >
                    {u.role === "admin"
                      ? "Admin"
                      : u.role === "staff"
                      ? "Staff"
                      : "Guest"}
                  </span>
                </td>
              </tr>
            ))}

            {!filteredUsers.length && (
              <tr>
                <td
                  colSpan={3}
                  className="py-10 text-center text-slate-400"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
