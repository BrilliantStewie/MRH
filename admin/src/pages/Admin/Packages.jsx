import React, { useContext, useEffect, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { Plus, Edit, Trash2 } from "lucide-react";

const Packages = () => {

  const {
    allPackages,
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,
    roomTypes,
    getRoomTypes
  } = useContext(AdminContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    name: "",
    roomType: "",
    price: "",
    description: "",
    includesAC: false,
    includesFood: false
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    getAllPackages();
    getRoomTypes();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      price: Number(formData.price)
    };

    if (editingId) {
      await updatePackage(editingId, data);
    } else {
      await addPackage(data);
    }

    closeModal();
    getAllPackages();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Packages</h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl"
        >
          <Plus size={18}/> Add Package
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">

          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Room Type</th>
              <th className="p-4">AC</th>
              <th className="p-4">Food</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>

            {allPackages?.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-400">
                  No packages created yet
                </td>
              </tr>
            )}

            {allPackages?.map(pkg => (
              <tr key={pkg._id} className="border-t">

                <td className="p-4 font-semibold">{pkg.name}</td>

                <td className="p-4">
                  {pkg.roomType?.name}
                </td>

                <td className="p-4">
                  {pkg.includesAC ? "Aircon" : "Fan"}
                </td>

                <td className="p-4">
                  {pkg.includesFood ? "With Food" : "No Food"}
                </td>

                <td className="p-4 font-bold">
                  ₱ {Number(pkg.price).toLocaleString()}
                </td>

                <td className="p-4 flex justify-end gap-2">

                  <button
                    onClick={()=>{
                      setEditingId(pkg._id);
                      setFormData({
                        ...pkg,
                        roomType: pkg.roomType?._id
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit size={16}/>
                  </button>

                  <button
                    onClick={async ()=>{
                      await deletePackage(pkg._id);
                      getAllPackages();
                    }}
                    className="p-2 hover:bg-rose-100 text-rose-600 rounded-lg"
                  >
                    <Trash2 size={16}/>
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>
      </div>

      {isModalOpen && (

        <div className="fixed inset-0 flex items-center justify-center bg-black/40">

          <div className="bg-white w-[420px] p-8 rounded-2xl">

            <h2 className="text-xl font-bold mb-6">
              {editingId ? "Edit Package" : "Add Package"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <input
                type="text"
                placeholder="Package name"
                required
                value={formData.name}
                onChange={(e)=>setFormData({...formData,name:e.target.value})}
                className="w-full border p-3 rounded-lg"
              />

              <select
                required
                value={formData.roomType}
                onChange={(e)=>setFormData({...formData,roomType:e.target.value})}
                className="w-full border p-3 rounded-lg"
              >
                <option value="">Select Room Type</option>
                {roomTypes?.map(rt=>(
                  <option key={rt._id} value={rt._id}>
                    {rt.name}
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e)=>setFormData({...formData,description:e.target.value})}
                className="w-full border p-3 rounded-lg"
              />

              <input
                type="number"
                placeholder="Price per pax"
                required
                value={formData.price}
                onChange={(e)=>setFormData({...formData,price:e.target.value})}
                className="w-full border p-3 rounded-lg"
              />

              <div className="flex gap-4">

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.includesAC}
                    onChange={()=>setFormData({...formData,includesAC:!formData.includesAC})}
                  />
                  Aircon
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.includesFood}
                    onChange={()=>setFormData({...formData,includesFood:!formData.includesFood})}
                  />
                  With Food
                </label>

              </div>

              <button className="w-full bg-indigo-600 text-white py-3 rounded-lg">
                Save Package
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default Packages;