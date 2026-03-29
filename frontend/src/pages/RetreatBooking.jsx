import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import DatePicker, { CalendarContainer } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { toast } from "react-toastify";
import {
    ArrowLeft, Calendar, User, Package, CheckCircle,
    Trash2, Image as ImageIcon, Building2, Users,
    Utensils, Wind, Tag, ChevronDown, ChevronUp, Info
} from "lucide-react";
import {
    getBookingCheckInDateValue,
    getBookingCheckOutDateValue,
} from "../utils/bookingDateFields";
import {
    FRONTEND_REALTIME_EVENT_NAME,
    matchesRealtimeEntity,
} from "../utils/realtime";

const RETREAT_AVAILABILITY_REFRESH_INTERVAL_MS = 15000;

const RetreatBooking = () => {
    const { backendUrl, token, selectedRooms, addRoom, removeRoom, clearRooms, currencySymbol } = useContext(AppContext);
    const navigate = useNavigate();
    const getStoredDate = (key) => {
        const value = sessionStorage.getItem(key);
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const [venueParticipants, setVenueParticipants] = useState(() => (
        sessionStorage.getItem("draftVenueParticipants") || ""
    ));


    // --- 1. STATE VARIABLES ---
    const [bookingName, setBookingName] = useState(() => (
        sessionStorage.getItem("draftBookingName") || ""
    ));
    const [startDate, setStartDate] = useState(() => getStoredDate("draftStartDate"));
    const [endDate, setEndDate] = useState(() => getStoredDate("draftEndDate"));

    // Load participants and packages from sessionStorage
    const [roomParticipants, setRoomParticipants] = useState(() => {
        const saved = sessionStorage.getItem("draftRoomParticipants");
        return saved ? JSON.parse(saved) : {};
    });

    // ✅ NEW: Tracks which package is selected for each specific room
    const [roomPackages, setRoomPackages] = useState(() => {
        const saved = sessionStorage.getItem("draftRoomPackages");
        return saved ? JSON.parse(saved) : {};
    });

    const [showAllRooms, setShowAllRooms] = useState(false);
    const [dbPackages, setDbPackages] = useState([]);
    const [roomUnavailableDates, setRoomUnavailableDates] = useState([]);
    const [userBookedDates, setUserBookedDates] = useState([]);
    const [guestReservedDates, setGuestReservedDates] = useState([]);
    const [capacityError, setCapacityError] = useState({});
    const [selectedPackages, setSelectedPackages] = useState(() => {
        const saved = sessionStorage.getItem("draftSelectedPackages");
        return saved ? JSON.parse(saved) : {};
    });

    // Save session state
    useEffect(() => {
        sessionStorage.setItem("draftVenueParticipants", venueParticipants);
    }, [venueParticipants]);

    useEffect(() => {
        sessionStorage.setItem("draftBookingName", bookingName);
    }, [bookingName]);

    useEffect(() => {
        if (startDate) sessionStorage.setItem("draftStartDate", startDate.toISOString());
        else sessionStorage.removeItem("draftStartDate");
    }, [startDate]);

    useEffect(() => {
        if (endDate) sessionStorage.setItem("draftEndDate", endDate.toISOString());
        else sessionStorage.removeItem("draftEndDate");
    }, [endDate]);

    useEffect(() => {
        sessionStorage.setItem("draftRoomParticipants", JSON.stringify(roomParticipants));
    }, [roomParticipants]);

    useEffect(() => {
        sessionStorage.setItem("draftRoomPackages", JSON.stringify(roomPackages));
    }, [roomPackages]);

    useEffect(() => {
        sessionStorage.setItem("draftSelectedPackages", JSON.stringify(selectedPackages));
    }, [selectedPackages]);

    const handleSelectPackage = (pkg) => {

        const type = (pkg.packageType || "").toLowerCase();

        setSelectedPackages(prev => {

            // ---------- AMENITIES (MULTIPLE) ----------
            if (type === "amenity") {

                const current = prev[type] || [];

                if (current.includes(pkg._id)) {
                    return {
                        ...prev,
                        [type]: current.filter(id => id !== pkg._id)
                    };
                }

                return {
                    ...prev,
                    [type]: [...current, pkg._id]
                };
            }

            // ---------- OTHER PACKAGE TYPES (ONLY ONE) ----------
            if (prev[type] === pkg._id) {

                const copy = { ...prev };
                delete copy[type];
                return copy;

            }

            return {
                ...prev,
                [type]: pkg._id
            };

        });

    };

    // --- 2. FETCH PACKAGES FROM API ---
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const { data } = await axios.get(backendUrl + '/api/package/list');
                if (data.success) {
                    setDbPackages(data.packages);
                }
            } catch (error) {
                console.error("Error fetching packages", error);
                toast.error("Could not load packages");
            }
        };
        fetchPackages();
    }, [backendUrl]);

    // ✅ NEW: Initialize default Participants AND Default Packages for newly added rooms
    useEffect(() => {
        setRoomParticipants(prev => {
            const updated = { ...prev };
            selectedRooms.forEach(room => {
                if (!updated[room._id]) {
                    const roomTypeLabel = getRoomTypeLabel(room);
                    const isDorm = roomTypeLabel.toLowerCase().includes("dorm");
                    updated[room._id] = isDorm ? 3 : 1;
                }
            });
            return updated;
        });

        setRoomPackages(prev => {
            const updated = { ...prev };
            let changed = false;
            selectedRooms.forEach(room => {
                if (!updated[room._id]) {
                    const roomTypeLabel = getRoomTypeLabel(room);
                    // Find packages that match this room's type
                    const availablePkgs = dbPackages.filter(pkg => pkg.roomType?.name?.toLowerCase() === roomTypeLabel.toLowerCase());
                    if (availablePkgs.length > 0) {
                        updated[room._id] = availablePkgs[0]._id; // Default to the first available package
                        changed = true;
                    }
                }
            });
            return changed ? updated : prev;
        });
    }, [selectedRooms, dbPackages]);

    const getTotalParticipants = () => {

        if (selectedRooms.length === 0) {
            return Number(venueParticipants) || 0;
        }

        return selectedRooms.reduce(
            (sum, room) => sum + Number(roomParticipants[room._id] || 0),
            0
        );

    };

    // --- 4. HELPERS ---
    const toDateObj = (dateString) => {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const getRoomImage = (room) => {
        if (!room) return null;
        if (room.coverImage) return room.coverImage;
        if (Array.isArray(room.images) && room.images.length > 0) return room.images[0];
        return room.imageUrl || (Array.isArray(room.image) ? room.image[0] : room.image);
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("http")) return imagePath;
        return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
    };

    const getPrice = (priceVal) => Number(priceVal?.$numberDecimal || priceVal || 0);
    const getRoomTypeLabel = (room) => String(room?.roomType || "").trim();

    const hasVenuePackageSelected = () => {
        return dbPackages.some((pkg) => {
            const type = pkg.packageType?.toLowerCase();
            if (type !== "venue package") return false;
            const selected = selectedPackages[type];
            return Array.isArray(selected) ? selected.includes(pkg._id) : selected === pkg._id;
        });
    };

    useEffect(() => {
        if (!dbPackages.length) return;

        const venueType = "venue package";
        const hasRooms = selectedRooms.length > 0;

        setSelectedPackages(prev => {
            if (hasRooms) {
                if (!prev[venueType]) return prev;
                const updated = { ...prev };
                delete updated[venueType];
                return updated;
            }

            if (prev[venueType]) return prev;

            const venuePackages = dbPackages.filter(
                pkg => pkg.packageType?.toLowerCase() === venueType
            );

            if (!venuePackages.length) return prev;

            const preferred =
                venuePackages.find(pkg => /regular.*venue.*only/i.test(pkg.name || "")) ||
                venuePackages.find(pkg => /venue.*only/i.test(pkg.name || "")) ||
                venuePackages[0];

            return {
                ...prev,
                [venueType]: preferred._id
            };
        });
    }, [dbPackages, selectedRooms.length]);

    // --- 5. AVAILABILITY CHECKS ---
    useEffect(() => {
        if (!backendUrl) return undefined;

        if (token) fetchUserBookedDates({ silent: true });
        fetchRoomUnavailableDates({ silent: true });

        const runVisibleRefresh = () => {
            if (document.visibilityState !== "visible") return;
            if (token) fetchUserBookedDates({ silent: true });
            fetchRoomUnavailableDates({ silent: true });
        };

        const interval = setInterval(runVisibleRefresh, RETREAT_AVAILABILITY_REFRESH_INTERVAL_MS);
        const handleFocus = () => runVisibleRefresh();
        const handleVisibilityChange = () => runVisibleRefresh();

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [backendUrl, token, selectedRooms]);

    const fetchGuestReservedDates = async ({ silent = false } = {}) => {
        if (!backendUrl) return;

        try {
            const { data } = await axios.get(backendUrl + "/api/booking/calendar-availability");
            if (data.success) {
                const counts = new Map();
                (data.bookings || []).forEach((b) => {
                    const start = toDateObj(getBookingCheckInDateValue(b));
                    const end = toDateObj(getBookingCheckOutDateValue(b));
                    const bookingCountRaw = Number(b.bookingCount);
                    const bookingCount = Number.isFinite(bookingCountRaw) && bookingCountRaw > 0 ? bookingCountRaw : 1;

                    let current = new Date(start);
                    while (current <= end) {
                        const key = current.getTime();
                        counts.set(key, (counts.get(key) || 0) + bookingCount);
                        current.setDate(current.getDate() + 1);
                    }
                });
                const reserved = Array.from(counts.entries())
                    .filter(([, count]) => count >= 2)
                    .map(([time]) => new Date(time));
                setGuestReservedDates(reserved);
            }
        } catch (error) {
            if (silent) {
                console.error("Guest availability refresh error:", error);
            } else {
                console.error("Failed to load guest availability:", error);
            }
        }
    };

    useEffect(() => {
        if (!backendUrl) return undefined;

        fetchGuestReservedDates({ silent: true });

        const runVisibleRefresh = () => {
            if (document.visibilityState === "visible") {
                fetchGuestReservedDates({ silent: true });
            }
        };

        const interval = setInterval(runVisibleRefresh, RETREAT_AVAILABILITY_REFRESH_INTERVAL_MS);
        const handleFocus = () => fetchGuestReservedDates({ silent: true });
        const handleVisibilityChange = () => runVisibleRefresh();

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [backendUrl]);

    const fetchRoomUnavailableDates = async ({ silent = false } = {}) => {

    if (selectedRooms.length === 0) {
        setRoomUnavailableDates([]);
        return;
    }

    try {

        const { data } = await axios.post(
            backendUrl + "/api/booking/unavailable-dates",
            { roomIds: selectedRooms.map(r => r._id) }
        );

        if (data.success) {

            setRoomUnavailableDates(
                data.blockedDates.map(toDateObj)
            );

        }

    } catch (error) {
        if (silent) {
            console.error("Room availability refresh error:", error);
        } else {
            console.error(error);
        }
    }

};

    const fetchUserBookedDates = async ({ silent = false } = {}) => {
        if (!token) {
            setUserBookedDates([]);
            return;
        }
        try {
            const { data } = await axios.get(backendUrl + "/api/booking/user-dates", { headers: { token } });
            if (data.success) setUserBookedDates(data.userBusyDates.map(toDateObj));
        } catch (error) {
            if (silent) {
                console.error("User booked dates refresh error:", error);
            } else {
                console.error(error);
            }
        }
    };

    useEffect(() => {
        if (!backendUrl) return undefined;

        const handleRealtimeUpdate = (event) => {
            if (!matchesRealtimeEntity(event.detail, ["bookings"])) {
                return;
            }

            fetchRoomUnavailableDates({ silent: true });
            fetchGuestReservedDates({ silent: true });

            if (token) {
                fetchUserBookedDates({ silent: true });
            }
        };

        window.addEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
        return () => {
            window.removeEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
        };
    }, [backendUrl, token, selectedRooms]);

    const isSameDayBooking = startDate && endDate && toDateObj(startDate).getTime() === toDateObj(endDate).getTime();

    useEffect(() => {
        if (startDate && endDate && endDate < startDate) {
            setEndDate(null);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (isSameDayBooking && selectedRooms.length > 0) {
            if (clearRooms) clearRooms();
            setRoomParticipants({});
            setRoomPackages({});
        }
    }, [isSameDayBooking, selectedRooms.length]);

    const handleRemoveRoom = (roomId) => {
        if (removeRoom) {
            removeRoom(roomId);
            setRoomParticipants(prev => { const updated = { ...prev }; delete updated[roomId]; return updated; });
            setRoomPackages(prev => { const updated = { ...prev }; delete updated[roomId]; return updated; }); // Clear package memory
        }
    };

    const allBlockedDates = [...roomUnavailableDates, ...userBookedDates, ...guestReservedDates];

    const getDayClass = (date) => {

    const time = toDateObj(date).getTime();
    const todayTime = toDateObj(new Date()).getTime();

    if (time < todayTime) {
        return "past-date";
    }

    // 🟢 Your own booking
    if (userBookedDates.some(d => d.getTime() === time)) {
        return "my-booking-date";
    }

    // 🟨 Reserved (2 bookings already scheduled)
    if (guestReservedDates.some(d => d.getTime() === time)) {
        return "guest-reserved-date";
    }

    // 🟡 Other users booking (only if a room is selected)
    if (selectedRooms.length > 0 &&
        roomUnavailableDates.some(d => d.getTime() === time)) {
        return "other-booking-date";
    }

    return "available-date";
};

    const CalendarLegendContainer = ({ className, children }) => {
        return (
            <div className="retreat-calendar-wrap">
                <CalendarContainer className={className}>
                    {children}
                    <div className="retreat-calendar-legend">
                        <div className="legend-item">
                            <span className="legend-dot legend-available" />
                            <span className="legend-label">Available</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot legend-reserved" />
                            <span className="legend-label">Reserved</span>
                        </div>
                    </div>
                </CalendarContainer>
            </div>
        );
    };

    const getDuration = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (start.getTime() === end.getTime()) return 1;
        return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    };

    // --- 6. CALCULATION LOGIC ---
    // ✅ FIXED: Calculates total dynamically based on EACH room's assigned package
    const calculateTotal = () => {

        const days = Math.max(getDuration(), 1);
        let total = 0;

        // Room packages
        selectedRooms.forEach(room => {

            const pax = roomParticipants[room._id] || 0;
            const pkgId = roomPackages[room._id];

            if (pkgId) {
                const pkg = dbPackages.find(p => p._id === pkgId);
                if (pkg) {
                    total += pax * getPrice(pkg.price) * days;
                }
            }

        });

        // Extra packages
        Object.values(selectedPackages).forEach(pkgId => {

            if (Array.isArray(pkgId)) {

                pkgId.forEach(id => {
                    const pkg = dbPackages.find(p => p._id === id);
                    if (pkg) total += getPrice(pkg.price) * getTotalParticipants() * days;
                });

            } else {

                const pkg = dbPackages.find(p => p._id === pkgId);
                if (pkg) total += getPrice(pkg.price) * getTotalParticipants() * days;

            }

        });

        return total;

    };

    const handleProceed = async () => {
        if (!startDate || !endDate) return toast.error("Please select dates.");
        if (!token) { toast.error("Please login first."); navigate("/login"); return; }
        if (!bookingName.trim()) return toast.error("Please enter an Event Name.");
        if (selectedRooms.length === 0) {
            if (Number(venueParticipants) <= 0) {
                return toast.error("Please enter venue participants.");
            }
            if (!hasVenuePackageSelected()) {
                return toast.error("Please select a venue retreat package.");
            }
        }

        for (const room of selectedRooms) {
            if (!roomPackages[room._id]) {
                toast.error(`Please select a package for ${room.name}.`);
                return;
            }
            const isDorm = getRoomTypeLabel(room).toLowerCase().includes("dorm");
            const minPax = isDorm ? 3 : 1;
            const assignedPax = Number(roomParticipants[room._id]) || 0;
            if (assignedPax < minPax) {
                toast.error(`Minimum participants for ${room.name} is ${minPax}.`);
                return;
            }
        }

        try {
            const bookingPayload = {
                bookingName,
                roomIds: selectedRooms.map(r => r._id),
                checkInDate: startDate,
                checkOutDate: endDate,
                participants: Number(venueParticipants) || 0,

                bookingItems: selectedRooms.map(room => ({
                    roomId: room._id,
                    roomGuests: Number(roomParticipants[room._id]) || 1,
                    packageId: roomPackages[room._id]
                })),

                extraPackages: Object.values(selectedPackages).flat()
            };

            const { data } = await axios.post(backendUrl + "/api/booking/create", bookingPayload, { headers: { token } });

            if (data.success) {
                toast.success("Booking request sent!");
                setStartDate(null);
                setEndDate(null);
                setRoomParticipants({});
                setRoomPackages({});
                setBookingName("");
                setVenueParticipants("");
                setSelectedPackages({});
                sessionStorage.removeItem("draftRoomParticipants");
                sessionStorage.removeItem("draftRoomPackages");
                sessionStorage.removeItem("draftBookingName");
                sessionStorage.removeItem("draftVenueParticipants");
                sessionStorage.removeItem("draftStartDate");
                sessionStorage.removeItem("draftEndDate");
                sessionStorage.removeItem("draftSelectedPackages");
                if (clearRooms) clearRooms();
                navigate("/my-bookings");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Booking failed");
        }
    };

    const handleAutoRoomSelection = async () => {

        const participants = Number(venueParticipants);

        if (!participants <= 0) {
            return toast.error("Enter venue participants first.");
        }

        try {
            const { data } = await axios.get(backendUrl + "/api/room/list");
            if (!data.success) return;

            clearRooms();
            let remaining = participants;
            const sortedRooms = [...data.rooms].sort((a, b) => b.capacity - a.capacity);
            const selected = [];

            for (const room of sortedRooms) {
                if (remaining <= 0) break;
                if (selectedRooms.some(r => r._id === room._id)) continue;
                const capacity = Number(room.capacity);
                if (getRoomTypeLabel(room).toLowerCase().includes("dorm") && remaining < 3) continue;
                selected.push(room);
                remaining -= capacity;
            }

            if (selected.length === 0) return toast.error("No suitable rooms found");

            let remainingPax = participants;
            const newParticipantsObj = {};

            selected.forEach(room => {
                addRoom(room);
                const capacity = Number(room.capacity);
                const assigned = Math.min(capacity, remainingPax);
                newParticipantsObj[room._id] = assigned;
                remainingPax -= assigned;
            });

            setRoomParticipants(newParticipantsObj);
            toast.success("Rooms auto selected");
        } catch (error) {
            console.log(error);
            toast.error("Error selecting rooms");
        }
    };

    const isInvalidBookingState =
        !bookingName.trim() ||
        !startDate ||
        !endDate ||
        (selectedRooms.length === 0 && (venueParticipants <= 0 || !hasVenuePackageSelected())) ||
        (isSameDayBooking && selectedRooms.length > 0) ||
        selectedRooms.some(room => !roomPackages[room._id]);

    // Get unique package IDs currently in use to display in Step 3
    const uniqueSelectedPackageIds = [
        ...new Set([
            ...Object.values(roomPackages),
            ...Object.values(selectedPackages).flat()
        ].filter(Boolean))
    ];

    // Packages WITHOUT room types (for Step 3)

    // --- PACKAGE INCLUSION DISPLAY LOGIC ---

    const hasRooms = selectedRooms.length > 0;

    const isSameDay =
        startDate &&
        endDate &&
        new Date(startDate).toDateString() === new Date(endDate).toDateString();

    // Venue packages
    const venuePackages = dbPackages.filter(
        pkg => pkg.packageType?.toLowerCase() === "venue package"
    );

    // Other packages except room package
    const otherPackages = dbPackages.filter(
        pkg => pkg.packageType?.toLowerCase() !== "room package"
    );

    let displayPackages = [];

    if (hasRooms) {

        // Rooms booked → hide venue packages
        displayPackages = otherPackages.filter(
            pkg => pkg.packageType?.toLowerCase() !== "venue package"
        );

    } else {

        // No rooms → always show venue packages (and other non-room packages)
        displayPackages = [
            ...venuePackages,
            ...otherPackages.filter(
                pkg => pkg.packageType?.toLowerCase() !== "venue package"
            )
        ];

    }

    return (
        <div className="min-h-screen bg-slate-50 px-3 pt-8 pb-20 font-sans text-slate-900 sm:px-4 lg:px-6 xl:px-8 2xl:px-10">
            <style>{`
                .react-datepicker-wrapper { width: 100%; }
                .react-datepicker { font-family: inherit; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: none; overflow: hidden; }
                .react-datepicker__header { background-color: #fff; border-bottom: 1px solid #f1f5f9; padding-top: 15px; }
                .retreat-calendar-wrap .react-datepicker {
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
                .retreat-calendar-legend {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 10px 16px 12px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
  margin-top: auto;
}
                .retreat-calendar-legend .legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
                .retreat-calendar-legend .legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  display: inline-block;
}
                .retreat-calendar-legend .legend-available {
  background: #ffffff;
  border: 1px solid #cbd5f5;
}
                .retreat-calendar-legend .legend-reserved {
  background: #f59e0b;
  border: 1px solid #d97706;
}
                .retreat-calendar-legend .legend-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}
                .react-datepicker__day--disabled {
  opacity: 0.6;
  background-color: #f1f5f9 !important;
  color: #94a3b8 !important;
  cursor: not-allowed;
  text-decoration: none;
}
                .past-date,
                .react-datepicker__day--disabled.past-date {
  opacity: 0.35;
  filter: blur(0.6px);
  background-color: #f8fafc !important;
  color: #94a3b8 !important;
  font-weight: 500;
}
                .my-booking-date {
  background-color: #fee2e2 !important;
  color: #b91c1c !important;
  font-weight: bold;
  border-radius: 6px;
}
                .my-booking-date::after {
  content: '';
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background-color: #dc2626;
  border-radius: 50%;
}

.other-booking-date {
  background-color: #fef9c3 !important;
  color: #854d0e !important;
  font-weight: 600;
  border-radius: 6px;
}
.guest-reserved-date {
  background-color: #fef9c3 !important;
  color: #854d0e !important;
  font-weight: 700;
  border-radius: 6px;
}
                .react-datepicker__day--disabled.my-booking-date,
                .react-datepicker__day--disabled.other-booking-date {
  background-color: #f1f5f9 !important;
  color: #94a3b8 !important;
}
.react-datepicker__day--disabled.guest-reserved-date {
  background-color: #fef9c3 !important;
  color: #854d0e !important;
  opacity: 0.9;
}
                .react-datepicker__day--disabled.my-booking-date::after {
  content: none;
}
                .react-datepicker__day--outside-month {
  opacity: 0.55;
  filter: blur(0.4px);
}
                .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: #0f172a !important; color: white !important; }
                .custom-input { width: 100%; padding: 12px 16px 12px 42px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 600; color: #334155; outline: none; transition: all 0.2s; background: white; }
                .custom-input:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05); }
            `}</style>

            <div className="mb-8 flex w-full items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-slate-700" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Complete Your Booking</h1>
            </div>

            <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-6">

                    {/* 1. DATES & PEOPLE */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">1</span>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Event Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Event Name / Group Name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Tag size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
                                    <input type="text" value={bookingName} onChange={(e) => setBookingName(e.target.value)} className="custom-input" placeholder="e.g. HNU Retreat, Family Reunion, Youth Camp..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Check-in Date</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        selectsStart
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={new Date()}
                                        excludeDates={allBlockedDates}
                                        dayClassName={getDayClass}
                                        placeholderText="Select Date"
                                        className="custom-input"
                                        dateFormat="MM/dd/yyyy"
                                        calendarContainer={CalendarLegendContainer}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Check-out Date</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => {
                                            if (startDate && date && date < startDate) {
                                                setEndDate(null);
                                                return;
                                            }
                                            setEndDate(date);
                                        }}
                                        selectsEnd
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={startDate || new Date()}
                                        excludeDates={allBlockedDates}
                                        dayClassName={getDayClass}
                                        placeholderText="Select Date"
                                        className="custom-input"
                                        dateFormat="MM/dd/yyyy"
                                        calendarContainer={CalendarLegendContainer}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-1 max-w-xs"> {/* Restricted width to shorten length */}
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Participants
                                    </label>
                                    {/* Compact Total Display as a Badge */}
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                        Total: {getTotalParticipants()}
                                    </span>
                                </div>

                                <div className="group flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-slate-900 transition-all shadow-sm">
                                    {/* Icon Prefix */}
                                    <div className="pl-4 pr-2 text-slate-400 group-focus-within:text-slate-900">
                                        <User size={16} />
                                    </div>

                                    {selectedRooms.length === 0 ? (
                                        <input
                                            type="number"
                                            min="1"
                                            value={venueParticipants}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === "" || Number(value) >= 0) setVenueParticipants(value);
                                            }}
                                            onKeyDown={(e) => ["-", "e"].includes(e.key) && e.preventDefault()}
                                            className="w-full py-2.5 pr-4 text-sm outline-none text-slate-700 font-bold bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                                            placeholder="0"
                                        />
                                    ) : (
                                        <div className="py-2.5 pr-4 text-sm font-bold text-slate-400 italic">
                                            Rooms Selected
                                        </div>
                                    )}
                                </div>

                                <p className="text-[9px] leading-tight text-slate-400 mt-2 ml-1">
                                    Enter count to auto-assign or add rooms manually.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. ROOMS & PACKAGES */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">

                        {/* Auto Room Selection */}


                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">2</span>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Rooms & Packages</h2>
                            </div>
                            <div className="flex items-center gap-3">

                                {Number(venueParticipants) > 0 && selectedRooms.length === 0 && !isSameDayBooking && (
                                    <button
                                        onClick={handleAutoRoomSelection}
                                        className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200"
                                    >

                                        Auto Select
                                    </button>
                                )}

                                {selectedRooms.length > 0 && (
                                    <button
                                        onClick={() => {
                                            clearRooms();
                                            setRoomParticipants({});
                                            setRoomPackages({});
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase tracking-tight transition-colors"
                                    >
                                        Remove All
                                    </button>
                                )}

                                {selectedRooms.length > 0 && !isSameDayBooking && (
                                    <button
                                        onClick={() => navigate('/rooms')}
                                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                                    >
                                        <span className="text-sm">+</span> Add Another Room
                                    </button>
                                )}

                            </div>
                        </div>

                        {selectedRooms.length === 0 ? (
                            <div className={`p-4 rounded-xl border border-dashed flex flex-row items-center justify-between gap-4 ${isSameDayBooking ? "bg-slate-100 border-slate-300" : "bg-slate-50 border-slate-200"}`}>
                                <p className={`text-sm font-medium ml-2 ${isSameDayBooking ? "text-slate-400" : "text-slate-500"}`}>
                                    {isSameDayBooking ? "Rooms are not available for same-day events." : "No accommodation selected."}
                                </p>
                                <button onClick={() => { if (!isSameDayBooking) navigate('/rooms') }} disabled={isSameDayBooking} className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors ${isSameDayBooking ? "bg-slate-200 text-slate-400 cursor-not-allowed border-transparent" : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-100"}`}>+ Add Room</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {isSameDayBooking && (
                                    <div className="p-3 mb-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
                                        ⚠️ {selectedRooms.length === 1 ? "A room" : "Rooms"} cannot be booked for same-day events. Please adjust dates.
                                    </div>
                                )}
                                {selectedRooms.slice(0, showAllRooms ? selectedRooms.length : 3).map((room) => {
                                    const fullImageUrl = getImageUrl(getRoomImage(room));
                                    const capacity = Number(room.capacity) || 0;
                                    const roomTypeLabel = getRoomTypeLabel(room);
                                    const isDorm = roomTypeLabel.toLowerCase().includes("dorm");
                                    const minPax = isDorm ? 3 : 1;

                                    // Available packages for this specific room
                                    const availablePkgs = dbPackages.filter(pkg => pkg.roomType?.name?.toLowerCase() === roomTypeLabel.toLowerCase());

                                    return (
                                        <div key={room._id} className={`group flex flex-col sm:flex-row gap-4 p-4 bg-white border rounded-xl transition-all duration-300 ${isSameDayBooking ? "border-red-200 opacity-50 grayscale" : "border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300"}`}>
                                            {/* Left: Image & Room Details */}
                                            <div className="flex gap-4 flex-1">
                                                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                                                    {fullImageUrl ? (
                                                        <img src={fullImageUrl} alt="Room" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://via.placeholder.com/100?text=No+Img" }} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left relative">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <h4 className="font-bold text-slate-900 text-base leading-none pr-6">{room.name}</h4>
                                                        <button onClick={() => handleRemoveRoom(room._id)} className="absolute top-0 right-0 text-slate-400 hover:text-red-500 p-1 bg-white hover:bg-red-50 rounded-lg transition-all" title="Remove Room">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wide mb-2 flex items-center gap-2">
                                                        {room.roomType} {room.building && <span>• {room.building}</span>}
                                                    </p>
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                                                        <Users size={10} /> Max {capacity} {capacity === 1 ? "Person" : "People"}
                                                    </div>

                                                    {/* ✅ NEW: Inline Participants & Package Form */}
                                                    <div className="mt-4 flex flex-col sm:flex-row gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                                        <div className="w-full sm:w-1/3">
                                                            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Participants (Min {minPax})</label>
                                                            <input
                                                                type="number"
                                                                min={minPax}
                                                                max={capacity}
                                                                value={roomParticipants[room._id] ?? ""}
                                                                onChange={(e) => {
                                                                    let value = e.target.value;
                                                                    if (value === "") { setRoomParticipants(prev => ({ ...prev, [room._id]: "" })); setCapacityError(prev => ({ ...prev, [room._id]: "" })); return; }
                                                                    value = Number(value);
                                                                    if (value > capacity) { setCapacityError(prev => ({ ...prev, [room._id]: `Max is ${capacity}` })); value = capacity; }
                                                                    else if (value < minPax) { setCapacityError(prev => ({ ...prev, [room._id]: `Min is ${minPax}` })); }
                                                                    else { setCapacityError(prev => ({ ...prev, [room._id]: "" })); }
                                                                    setRoomParticipants(prev => ({ ...prev, [room._id]: value }));
                                                                }}
                                                                className={`w-full border rounded-md px-2 py-1.5 text-xs font-semibold ${capacityError[room._id] ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200'}`}
                                                            />
                                                        </div>
                                                        <div className="w-full sm:w-2/3">
                                                            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Assigned Package</label>
                                                            <div className="relative">
                                                                <Package size={14} className="absolute left-2.5 top-2 text-blue-500 z-10" />
                                                                <select
                                                                    value={roomPackages[room._id] || ""}
                                                                    onChange={(e) => setRoomPackages(prev => ({ ...prev, [room._id]: e.target.value }))}
                                                                    className={`w-full border rounded-md pl-8 pr-2 py-1.5 text-xs font-semibold appearance-none bg-white ${!roomPackages[room._id] ? 'border-red-400 ring-1 ring-red-400' : 'border-blue-200'}`}
                                                                >
                                                                    {availablePkgs.length === 0 ? (
                                                                        <option value="" disabled>No packages for this room type</option>
                                                                    ) : (
                                                                        <>
                                                                            <option value="" disabled>Select a package...</option>
                                                                            {availablePkgs.map(pkg => (
                                                                                <option key={pkg._id} value={pkg._id}>
                                                                                    {pkg.name} (+{currencySymbol}{getPrice(pkg.price)}/pax)
                                                                                </option>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {capacityError[room._id] && <p className="text-[10px] text-red-500 mt-1 font-semibold">⚠ {capacityError[room._id]}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {selectedRooms.length > 3 && (
                                    <button onClick={() => setShowAllRooms(!showAllRooms)} className="w-full py-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-tighter bg-slate-50 rounded-lg">
                                        {showAllRooms ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Show All Rooms ({selectedRooms.length})</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. PACKAGE DETAILS (Informational) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">3</span>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Package Inclusions</h2>
                        </div>

                        {displayPackages.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Info size={24} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-xs font-medium text-slate-500">Select rooms and assign packages above to see their inclusions here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {displayPackages.map((pkg) => {
                                    const type = pkg.packageType?.toLowerCase();

                                    const isSelected =
                                        type === "amenity"
                                            ? (selectedPackages[type] || []).includes(pkg._id)
                                            : selectedPackages[type] === pkg._id;
                                    if (!pkg) return null;
                                    const pkgPrice = getPrice(pkg.price);


                                    return (
                                        <div
                                            key={pkg._id}
                                            onClick={() => handleSelectPackage(pkg)}
                                            className={`border rounded-xl p-5 relative flex flex-col h-full shadow-sm cursor-pointer transition
  ${isSelected
                                                    ? "border-green-500 bg-green-50"
                                                    : "border-blue-100 bg-blue-50/20 hover:border-blue-400"}
`}
                                        >
                                            {isSelected && (
                                                <CheckCircle size={14} className="absolute top-2 right-2 text-green-500" />
                                            )}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><Package size={18} /></div>
                                            </div>
                                            <h3 className="font-bold text-sm text-slate-900 mb-1">{pkg.name}</h3>
                                            <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-grow">{pkg.description || "No description provided."}</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {pkg.amenities?.length > 0 ? (
                                                    pkg.amenities.map((amenity, index) => (
                                                        <span
                                                            key={index}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 uppercase"
                                                        >
                                                            {amenity}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">
                                                        No amenities
                                                    </span>
                                                )}
                                            </div>
                                            <div className="pt-3 border-t border-slate-200 mt-auto">
                                                <p className="font-bold text-slate-900 text-sm">
                                                    {pkgPrice === 0 ? "Free / Included" : `+${currencySymbol}${pkgPrice}`}
                                                    {pkgPrice > 0 && <span className="text-xs text-slate-400 font-medium"> /pax/day</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT: SUMMARY --- */}
                <div className="w-full lg:w-[380px] xl:w-[400px] 2xl:w-[430px]">
                    <div className="sticky top-6 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Booking Summary</h3>
                        {bookingName && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Event Name</p>
                                <p className="text-sm font-bold text-blue-900 break-words">{bookingName}</p>
                            </div>
                        )}
                        <div className="space-y-4 text-sm text-slate-600 mb-8">
                            <div className="flex justify-between">
                                <span>Duration</span>
                                <span className="font-bold text-slate-900">{getDuration() > 0 ? getDuration() + " Days" : "--"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Participants</span>
                                <span className="font-bold text-slate-900">{getTotalParticipants()} {getTotalParticipants() === 1 ? "Person" : "People"}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 my-4"></div>
                            <div className="flex justify-between text-xs italic text-slate-400">
                                <span>Rooms</span>
                                <span>{selectedRooms.length > 0 ? `${selectedRooms.length} selected` : "None selected"}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-xs italic text-slate-400">
                                <div className="flex justify-between">
                                    <span>Packages</span>
                                    <span className="text-right truncate max-w-[150px] font-medium text-slate-600">
                                        {uniqueSelectedPackageIds.length > 0
                                            ? uniqueSelectedPackageIds.map(id => dbPackages.find(p => p._id === id)?.name).join(", ")
                                            : "None Selected"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Price</span>
                            <span className="font-extrabold text-3xl text-slate-900">{currencySymbol}{calculateTotal().toLocaleString()}</span>
                        </div>
                        <button onClick={handleProceed} disabled={isInvalidBookingState} className={`w-full py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${isInvalidBookingState ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200 active:scale-[0.98]"}`}>
                            Book Now <CheckCircle size={16} />
                        </button>
                        <div className="text-center mt-4 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            <span className="w-3 h-3 flex items-center justify-center rounded-full border border-slate-300">🔒</span>
                            Secure Checkout
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetreatBooking;


