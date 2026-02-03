import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';

const UploadPayment = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [file, setFile] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // bookingId should be passed as ?bookingId=...
  const bookingId = searchParams.get('bookingId');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error('Missing booking ID.');
      return;
    }
    if (!file) {
      toast.error('Please select an image file.');
      return;
    }

    const formData = new FormData();
    formData.append('booking_id', bookingId);
    formData.append('screenshot', file);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/booking/upload-proof`,
        formData,
        {
          headers: {
            token,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (data.success) {
        toast.success('Payment proof uploaded. Please wait for confirmation.');
        navigate('/my-bookings');
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error('Upload failed.');
    }
  };

  return (
    <div className='my-10 max-w-md mx-auto text-gray-900'>
      <h1 className='text-2xl font-semibold mb-4'>Upload Payment Proof</h1>
      <p className='text-sm text-gray-600 mb-4'>
        Please upload a clear screenshot of your GCash payment for this booking.
      </p>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <input
          type='file'
          accept='image/*'
          onChange={(e) => setFile(e.target.files[0] || null)}
          className='block w-full text-sm text-gray-700'
        />
        <button
          type='submit'
          className='bg-primary text-white px-6 py-2 rounded-full text-sm'
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default UploadPayment;
