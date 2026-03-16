import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Loader2, X, CheckCircle, Lock, RefreshCw } from "lucide-react";

const VerifyOtp = ({ email, onClose, onSuccess, backendUrl, isResetMode }) => {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [timer, setTimer] = useState(59);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
    document.body.style.overflow = "hidden";
    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      document.body.style.overflow = "unset";
      clearInterval(countdown);
    };
  }, []);

  const handleChange = (value, index) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError("");
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/send-otp`, { email });
      if (data.success) {
        setTimer(59);
        setOtp(new Array(6).fill(""));
        inputRefs.current[0].focus();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("").trim();
    if (otpCode.length < 6) return setError("Incomplete verification code");

    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(`${backendUrl}/api/user/verify-otp`, {
        email: email.toLowerCase().trim(),
        otp: otpCode,
        isResetMode: isResetMode
      });

      if (data.success) {
        setIsSuccess(true);
        if (typeof onSuccess === "function") {
          onSuccess(otpCode);
        }

        setTimeout(() => {
          if (typeof onClose === "function") onClose();
        }, 1500);
      } else {
        setError(data.message || "Invalid security code");
      }
    } catch (err) {
      setError("System error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white w-full max-w-[420px] rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-zinc-900 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-zinc-800 p-2 rounded-lg">
              <Lock size={18} className="text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest">{isResetMode ? "Recovery" : "Security"}</h2>
              <p className="text-[10px] text-zinc-500 font-medium">Verification Required</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 sm:p-10">
          {isSuccess ? (
            <div className="flex flex-col items-center py-4 text-center animate-in slide-in-from-bottom-2">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-zinc-200">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Identity Confirmed</h3>
              <p className="text-zinc-500 mt-2 text-sm">Security clearance granted. Proceeding...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-zinc-900">Enter Security Code</h3>
                <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
                  Enter the code sent to <span className="text-zinc-900 font-semibold">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      ref={(el) => (inputRefs.current[index] = el)}
                      value={digit}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onChange={(e) => handleChange(e.target.value, index)}
                      className="w-full h-12 text-center text-xl font-bold border-2 border-zinc-100 rounded-xl focus:border-zinc-900 focus:outline-none transition-all bg-zinc-50/50"
                    />
                  ))}
                </div>

                {error && (
                  <div className="text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-[11px] font-bold text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={loading || resending}
                    className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-3 hover:bg-black transition-all disabled:bg-zinc-200"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Verify Code"}
                  </button>

                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={timer > 0 || resending}
                      className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${timer > 0 || resending ? "text-zinc-300" : "text-zinc-900"}`}
                    >
                      <RefreshCw size={12} className={resending ? "animate-spin" : ""} /> Resend
                    </button>
                    {timer > 0 && <span className="text-[11px] font-mono text-zinc-400">00:{timer < 10 ? `0${timer}` : timer}</span>}
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
