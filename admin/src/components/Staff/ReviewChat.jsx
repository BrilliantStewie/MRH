import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ReviewChat = ({ booking, backendUrl, token, onUpdate }) => {
    const [message, setMessage] = useState("");

    const formatName = (name) => {
        if (!name) return "Guest";
        return name.includes('|') ? name.split('|')[0] : name;
    };

    const handleSend = async () => {
        if (!message.trim()) return;
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/staff/add-review-chat`,
                { bookingId: booking._id, message },
                { headers: { token } }
            );
            if (data.success) {
                setMessage("");
                onUpdate(); // Re-fetches bookings in the parent component
                toast.success("Message sent");
            }
        } catch (error) {
            toast.error("Error sending message");
        }
    };

    return (
        <div className="flex flex-col h-[350px] border rounded-xl bg-slate-50 mt-4 overflow-hidden shadow-inner">
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white">
                {booking.reviewChat?.map((chat, index) => (
                    <div key={index} className={`flex flex-col ${chat.role === 'staff' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">
                            {chat.role === 'staff' ? 'You' : formatName(chat.sender)}
                        </span>
                        <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                            chat.role === 'staff' 
                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                            {chat.message}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-3 bg-slate-50 border-t flex gap-2">
                <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Type a reply..."
                />
                <button onClick={handleSend} className="bg-emerald-600 text-white px-5 py-2 rounded-full text-xs font-bold uppercase hover:bg-emerald-700">
                    Send
                </button>
            </div>
        </div>
    );
};

export default ReviewChat;