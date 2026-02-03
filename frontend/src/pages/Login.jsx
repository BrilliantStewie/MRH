import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Eye, EyeOff } from 'lucide-react'; // ✅ Added Eye icons

const Login = () => {
  const { backendUrl, token, setToken } = useContext(AppContext);
  const navigate = useNavigate();

  const [state, setState] = useState('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);
  
  // ✅ New state for password visibility
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
      if (state === 'Sign Up') {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('phone', phone);
        if (image) formData.append('image', image);

        const { data } = await axios.post(backendUrl + '/api/user/register', formData);

        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
          toast.success("Account Created!");
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/user/login', { email, password });
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
          toast.success("Logged in successfully!");
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>{state === 'Sign Up' ? "Create Account" : "Login"}</p>
        <p>Please {state === 'Sign Up' ? "sign up" : "log in"} to book an appointment</p>
        
        {state === 'Sign Up' && (
          <div className="w-full flex justify-center mb-2">
            <label htmlFor="profile-pic" className="cursor-pointer relative group">
              <div className="w-20 h-20 rounded-full border-2 border-zinc-200 overflow-hidden bg-zinc-50 flex items-center justify-center">
                {image ? (
                  <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-zinc-300" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-md">
                <Camera size={14} />
              </div>
              <input 
                type="file" 
                id="profile-pic" 
                hidden 
                onChange={(e) => setImage(e.target.files[0])} 
              />
            </label>
          </div>
        )}

        {state === 'Sign Up' && (
          <div className='w-full'>
            <p>Full Name</p>
            <input className='border border-zinc-300 rounded w-full p-2 mt-1' type="text" onChange={(e) => setName(e.target.value)} value={name} required />
          </div>
        )}

        {state === 'Sign Up' && (
            <div className='w-full'>
              <p>Phone Number</p>
              <input className='border border-zinc-300 rounded w-full p-2 mt-1' type="text" onChange={(e) => setPhone(e.target.value)} value={phone} required />
            </div>
        )}

        <div className='w-full'>
          <p>Email</p>
          <input className='border border-zinc-300 rounded w-full p-2 mt-1' type="email" onChange={(e) => setEmail(e.target.value)} value={email} required />
        </div>

        {/* ✅ Updated Password Field with Eye Icon */}
        <div className='w-full relative'>
          <p>Password</p>
          <div className='relative w-full mt-1'>
            <input 
              className='border border-zinc-300 rounded w-full p-2 pr-10' 
              type={showPassword ? "text" : "password"} 
              onChange={(e) => setPassword(e.target.value)} 
              value={password} 
              required 
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button type='submit' className='bg-primary text-white w-full py-2 rounded-md text-base hover:bg-primary/90 transition-all'>
          {state === 'Sign Up' ? "Create Account" : "Login"}
        </button>

        {state === 'Sign Up' ? (
          <p>Already have an account? <span onClick={() => setState('Login')} className='text-primary underline cursor-pointer'>Login here</span></p>
        ) : (
          <p>Create an new account? <span onClick={() => setState('Sign Up')} className='text-primary underline cursor-pointer'>Click here</span></p>
        )}
      </div>
    </form>
  );
};

export default Login;