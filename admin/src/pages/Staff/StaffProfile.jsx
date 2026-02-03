// StaffProfile.jsx - FULLY MRH Compliant
import React, { useContext, useEffect, useState } from 'react';
import StaffContext from '../../context/StaffContext';
import AppContext from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import assets from '../../assets/assets';

const StaffProfile = () => {
  const { sToken, profileData, setProfileData, getProfileData, backendUrl, notifications } = useContext(StaffContext);
  const { currency } = useContext(AppContext);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (sToken) getProfileData(sToken);
  }, [sToken]);

  const updateProfile = async () => {
    try {
      const updateData = {
        address: profileData.address,
        phone: profileData.phone,
        available: profileData.available
      };
      const data = await axios.post(`${backendUrl}/api/staff/update-profile`, updateData, {
        headers: { Authorization: sToken }
      });
      if (data.data.success) {
        toast.success(data.data.message);
        setIsEdit(false);
        getProfileData(sToken);
      } else {
        toast.error(data.data.message);
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col gap-4 m-5">
      {/* Notifications Bell */}
      <div className="flex justify-end mb-4">
        <div className="relative">
          <img className="w-8 cursor-pointer" src={assets.notificationIcon} alt="Notifications" />
          {notifications?.filter(n => !n.isRead).length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications?.filter(n => !n.isRead).length}
            </span>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Image */}
        <div>
          <img 
            className="bg-primary80 w-full md:w-64 rounded-lg" 
            src={profileData?.image} 
            alt="Profile" 
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 border border-stone-100 rounded-lg p-8 py-7 bg-white">
          {/* Name & Role */}
          <div className="flex items-center gap-2">
            <p className="text-3xl font-medium text-gray-700">{profileData?.name}</p>
            <span className="px-3 py-1 bg-primary text-white text-sm rounded-full">
              MRH Staff
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-gray-600">
            <p>{profileData?.role || 'Staff'}</p>
            <span>•</span>
            <p>{profileData?.experience || '2+ years'}</p>
          </div>

          {/* About Section */}
          <div className="mt-6">
            <p className="flex items-center gap-1 text-sm font-medium text-neutral-800">
              <img src={assets.aboutIcon} alt="About" className="w-4" />
              About
            </p>
            <p className="text-sm text-gray-600 max-w-[700px] mt-1">
              {profileData?.about || 'Dedicated staff member at Mercedarian Retreat House, committed to providing excellent service and spiritual hospitality.'}
            </p>
          </div>

          {/* Contact Info */}
          <div className="mt-6">
            <p className="text-gray-600 font-medium mb-2">Contact Information</p>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Phone:</span> {profileData?.phone || 'Not set'}</p>
              <div>
                <p className="font-medium">Address:</p>
                {isEdit ? (
                  <>
                    <input 
                      type="text" 
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                      value={profileData?.address?.line1 || ''}
                      className="w-full border rounded px-2 py-1 text-sm mt-1"
                      placeholder="Address line 1"
                    />
                    <input 
                      type="text" 
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                      value={profileData?.address?.line2 || ''}
                      className="w-full border rounded px-2 py-1 text-sm mt-1"
                      placeholder="Address line 2"
                    />
                  </>
                ) : (
                  <p className="mt-1">{profileData?.address?.line1}, {profileData?.address?.line2}</p>
                )}
              </div>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center gap-2 pt-4 mt-4 border-t">
            <input 
              type="checkbox" 
              id="available"
              onChange={(e) => setProfileData(prev => ({ ...prev, available: !prev.available }))}
              checked={profileData?.available || false}
              className="w-4 h-4"
            />
            <label htmlFor="available" className="text-sm font-medium">
              Available for duty
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6 pt-4 border-t">
            {isEdit ? (
              <button 
                onClick={updateProfile}
                className="px-6 py-2 bg-primary text-white text-sm rounded-full hover:bg-primary-dark transition-all"
              >
                Save Changes
              </button>
            ) : (
              <button 
                onClick={() => setIsEdit(true)}
                className="px-6 py-2 border border-primary text-primary text-sm rounded-full hover:bg-primary hover:text-white transition-all"
              >
                Edit Profile
              </button>
            )}
            <button className="px-6 py-2 text-sm text-gray-500 underline">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
