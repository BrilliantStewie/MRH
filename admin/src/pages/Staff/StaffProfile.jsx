import { useEffect, useState } from "react";
import axios from "axios";

const StaffProfile = () => {
  const [staff, setStaff] = useState({});
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("sToken");

      const { data } = await axios.get(
        `${backendUrl}/api/staff/profile`,
        { headers: { token } }
      );

      if (data.success) setStaff(data.staff);
    };

    fetchProfile();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Profile</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <p><strong>Name:</strong> {staff.name}</p>
        <p><strong>Email:</strong> {staff.email}</p>
        <p><strong>Role:</strong> Staff</p>
      </div>
    </div>
  );
};

export default StaffProfile;
