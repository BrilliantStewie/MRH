import React, { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  ArrowUpDown, Search, User, RotateCcw, CalendarDays, ArrowRight,
  Moon, Home, Layers, Phone, CheckCircle, Building2,
  Package, Info, X, Clock, ChevronDown, Trash2,
  AlertCircle, CheckCircle2, XCircle, Banknote, Mail, Users, ChevronUp, ChevronLeft, ChevronRight
} from "lucide-react";
import FilterDropdown from "../../components/Admin/FilterDropdown";
import {
  getBookingArchiveStatus,
  getAvailableStayActions,
  getStayConfirmationDetails,
  getStayStatusDescription,
  getStayStatusMeta,
  matchesBookingStatusFilter,
  shouldShowBookingStatus,
  shouldShowStayStatus,
} from "../../utils/bookingStayStatus";
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../../utils/bookingDateFields";
import {
  formatDatePHT as formatDatePHTValue,
  getCurrentPHYear,
  getMonthLabelPHT,
  getPHDateValue,
  getPHMonthIndex,
  getPHYear,
} from "../../utils/dateTime";

const DEFAULT_BOOKINGS_PER_PAGE = 10;
const getBookingRequestTimestamp = (booking = {}) => {
  const requestDate =
    booking?.createdAt ||
    booking?.date ||
    booking?.updatedAt ||
    getBookingCheckInDateValue(booking) ||
    getBookingCheckOutDateValue(booking);
  const parsedDate = new Date(requestDate);
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
};

const getBookingRoomType = (item) =>
  String(item?.roomId?.roomType || item?.roomType || "").trim();

const getBookingBuilding = (item) =>
  String(item?.roomId?.building || item?.building || "").trim();

const getBookingRoomItems = (booking) =>
  Array.isArray(booking?.bookingItems)
    ? booking.bookingItems.filter((item) => item?.roomId)
    : [];

const isBookingFullyPaid = (booking = {}) =>
  booking?.fullyPaid === true ||
  booking?.payment === true ||
  String(booking?.paymentStatus || "").trim().toLowerCase() === "paid";

const isBookingSecured = (booking = {}) =>
  booking?.bookingSecured === true ||
  booking?.downpaymentSatisfied === true ||
  isBookingFullyPaid(booking);

const isRefundProcessed = (booking = {}) =>
  booking?.refundProcessed === true ||
  Number(booking?.refundedAmount || 0) > 0 ||
  Boolean(booking?.refundedAt);

const getRefundStatusLabel = (booking = {}) => {
  if (isRefundProcessed(booking)) {
    return `Refunded ₱${Number(booking?.refundedAmount || 0).toLocaleString()}`;
  }

  if (
    String(booking?.status || "").trim().toLowerCase() === "cancelled" &&
    booking?.refundEligible &&
    Number(booking?.refundableAmount || 0) > 0
  ) {
    return `Refund Due ₱${Number(booking?.refundableAmount || 0).toLocaleString()}`;
  }

  return "";
};

const getBookingPaymentMeta = (booking = {}) => {
  if (isBookingFullyPaid(booking)) {
    return {
      label: "Paid",
      className: "text-emerald-500",
      icon: CheckCircle2,
    };
  }

  if (Number(booking?.pendingPaymentAmount || 0) > 0 || booking?.paymentStatus === "pending") {
    return {
      label: "Pending",
      className: "text-amber-500",
      icon: Clock,
    };
  }

  if (isBookingSecured(booking)) {
    return {
      label: "Booked",
      className: "text-emerald-500",
      icon: CheckCircle2,
    };
  }

  return {
    label: "Unpaid",
    className: "text-amber-500",
    icon: Clock,
  };
};

// --- HELPER COMPONENT: Status Badge ---
const StatusBadge = ({ status }) => {
  let styles = "bg-slate-100 text-slate-500 border-slate-200";
  const s = String(status || "").replace(/[_-\s]/g, "").toLowerCase();

  if (["approved", "confirmed", "checkedin"].includes(s)) {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-100";
  } else if (s === 'pending' || s === 'cancellationpending') {
    styles = "bg-amber-50 text-amber-700 border-amber-100";
  } else if (s === "cancelled") {
    styles = "bg-rose-50 text-rose-700 border-rose-100";
  } else if (s === "declined") {
    // GRAY STYLE FOR DECLINED
    styles = "bg-slate-100 text-slate-600 border-slate-200 shadow-sm";
  }

  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${styles}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const StayStatusBadge = ({ booking }) => {
  const meta = getStayStatusMeta(booking);

  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const PaymentStatusIndicator = ({ booking, size = 10, className = "" }) => {
  const meta = getBookingPaymentMeta(booking);
  const Icon = meta.icon;

  return (
    <div className={`${className} ${meta.className}`}>
      <Icon size={size} />
      {meta.label}
    </div>
  );
};

const BookingUnitPreview = ({ booking, variant = "card" }) => {
  const roomList = getBookingRoomItems(booking);
  const previewRoom = roomList[0];
  const isTable = variant === "table";

  const containerClassName = isTable
    ? "inline-flex max-w-full items-center justify-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
    : "inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-100 bg-white px-2 py-1";
  const titleClassName = isTable
    ? "truncate text-[10px] font-semibold text-slate-600"
    : "truncate text-[9px] font-black text-slate-600";
  const metaClassName = isTable
    ? "ml-auto flex items-center gap-1 border-l border-slate-200 pl-1.5 text-[9px] text-slate-400"
    : "ml-auto flex items-center gap-0.5 border-l border-slate-200 pl-1.5 text-[8px] text-slate-400";
  const overflowClassName = isTable
    ? "text-[9px] font-semibold text-slate-500"
    : "text-[8px] font-bold text-slate-500";
  const iconSize = isTable ? 10 : 9;
  const capacityIconSize = isTable ? 8 : 7;

  if (!previewRoom) {
    return (
      <div className={containerClassName}>
        <Building2 size={iconSize} className="text-slate-400" />
        <span className={titleClassName}>Venue Only</span>
      </div>
    );
  }

  return (
    <>
      <div className={containerClassName}>
        <Home size={iconSize} className="text-slate-400" />
        <span className={titleClassName}>{previewRoom.roomId?.name || "Room"}</span>
        {previewRoom.roomId?.capacity && (
          <span className={metaClassName}>
            <Users size={capacityIconSize} /> {previewRoom.roomId?.capacity}
          </span>
        )}
      </div>
      {roomList.length > 1 && (
        <span className={overflowClassName}>
          +{roomList.length - 1} room{roomList.length - 1 > 1 ? "s" : ""}
        </span>
      )}
    </>
  );
};

// --- MODAL COMPONENT (High-End Details View) ---
const BookingDetailsModal = ({
  isOpen,
  onClose,
  booking,
  formatDate,
  backendUrl,
}) => {
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAllRooms(false);
      setShowAllPackages(false);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const getPackagesList = () => {
  if (!booking.bookingItems) return [];

  return booking.bookingItems
    .map(item => item.packageId)
    .filter(pkg => pkg); // remove null
};

  const packagesList = getPackagesList();
  const roomList = getBookingRoomItems(booking);
  const bookingTitle =
    String(booking.bookingName || "").trim() ||
    roomList[0]?.roomId?.name ||
    packagesList[0]?.name ||
    "Reservation";
  const showCustomerPhone = booking.userId?.authProvider !== "google";

  const visibleRooms = showAllRooms ? roomList : roomList.slice(0, 2);
  const visiblePackages = showAllPackages ? packagesList : packagesList.slice(0, 1);
  const stayConfirmationDetails = getStayConfirmationDetails(booking);
  const stayMeta = getStayStatusMeta(booking);
  const roomGuestCount = roomList.reduce((sum, item) => sum + Number(item?.roomGuests || 0), 0);
  const venueParticipants = Math.max(Number(booking?.participants || 0), 0);
  const totalParticipants = roomGuestCount + venueParticipants;
  const participantsSummary =
    roomGuestCount > 0 && venueParticipants > 0
      ? `${roomGuestCount} room guest${roomGuestCount === 1 ? "" : "s"} + ${venueParticipants} venue participant${venueParticipants === 1 ? "" : "s"}`
      : roomGuestCount > 0
        ? `${roomGuestCount} guest${roomGuestCount === 1 ? "" : "s"} assigned to rooms`
        : venueParticipants > 0
          ? `${venueParticipants} venue participant${venueParticipants === 1 ? "" : "s"}`
          : "No participants recorded";
  const declineReason = String(booking?.declineReason || "").trim();

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        <div className="relative h-28 bg-gradient-to-r from-slate-900 to-black p-6 flex items-end">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
            aria-label="Close booking details"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <CalendarDays size={28} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
                Booking Details
              </p>
              <h2 className="text-xl font-black text-white leading-none">{bookingTitle}</h2>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
                  {booking.userId?.image ? (
                    <img src={booking.userId.image.startsWith('http') ? booking.userId.image : `${backendUrl}/${booking.userId.image}`} className="w-full h-full object-cover" alt="user" />
                  ) : (booking.userId?.firstName?.[0])}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-sm font-black text-slate-800 truncate">{booking.userId?.firstName} {booking.userId?.lastName}</p>
                <div className="mt-1 space-y-1.5 w-full">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                        <Mail size={10} className="shrink-0" /> 
                        <span className="break-all leading-relaxed">{booking.userId?.email || "No Email"}</span>
                    </div>
                    {showCustomerPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                          <Phone size={10} className="shrink-0" /> 
                          <span>{booking.userId?.phone || "No Phone"}</span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm shadow-slate-100/60">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Participants
                </p>
                <Users size={12} className="text-slate-300" />
              </div>
              <p className="mt-1 text-[22px] font-black leading-none text-slate-800">
                {totalParticipants}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-slate-500">{participantsSummary}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Period</h3>
            <div className="grid grid-cols-[minmax(0,1fr)_30px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-2.5">
              <div className="min-w-0 rounded-xl border border-blue-100 bg-white/90 px-2.5 py-2 text-left shadow-sm shadow-blue-100/40">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-600">Check-In</p>
                <p className="mt-0.5 truncate text-[11px] font-black text-slate-700">{formatDate(getBookingCheckInDateValue(booking))}</p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-300">
                <ArrowRight size={12} />
              </div>
              <div className="min-w-0 rounded-xl border border-blue-100 bg-white/90 px-2.5 py-2 text-left shadow-sm shadow-blue-100/40">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-600">Check-Out</p>
                <p className="mt-0.5 truncate text-[11px] font-black text-slate-700">{formatDate(getBookingCheckOutDateValue(booking))}</p>
              </div>
            </div>
            <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Stay Confirmation</p>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Check-In</p>
                    <span className="text-[7px] font-black uppercase tracking-[0.12em] text-emerald-600">
                      {stayConfirmationDetails.checkIn.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] font-bold text-slate-700">
                    {stayConfirmationDetails.checkIn.actorName || "No confirmer yet"}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-snug text-slate-500">
                    {stayConfirmationDetails.checkIn.timestamp || stayConfirmationDetails.checkIn.fallbackMessage}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Check-Out</p>
                    <span className="text-[7px] font-black uppercase tracking-[0.12em] text-sky-600">
                      {stayConfirmationDetails.checkOut.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] font-bold text-slate-700">
                    {stayConfirmationDetails.checkOut.actorName || "No confirmer yet"}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-snug text-slate-500">
                    {stayConfirmationDetails.checkOut.timestamp || stayConfirmationDetails.checkOut.fallbackMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            {String(booking?.status || "").trim().toLowerCase() === "declined" && declineReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
                  Decline Reason
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-rose-800">
                  {declineReason}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Reserved Units {roomList.length > 0 ? `(${roomList.length})` : "(Venue Only)"}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleRooms.length > 0 ? (
                visibleRooms.map((room, i) => {
                  const roomData = room.roomId;

                  const roomImg = (Array.isArray(roomData?.images) && roomData.images.length > 0)
                    ? roomData.images[0]
                    : roomData?.coverImage;

                  const imageUrl = (roomImg && typeof roomImg === 'string')
                    ? (roomImg.startsWith('http') ? roomImg : `${backendUrl}/${roomImg}`)
                    : null;

                  return (
                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="h-12 w-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} className="w-full h-full object-cover" alt="room" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Home size={14} className="text-slate-300" /></div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <p className="text-[11px] font-black text-slate-800">
                            {room.roomId?.name || "Room"}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{room.roomId?.building}</p>
                        </div>
                        <div className="flex justify-between items-end mt-0.5">
                          <p className="text-[10px] text-slate-500 font-medium">{room.roomId?.roomType}</p>
                          <p className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 rounded-md flex items-center gap-1"><Users size={10} /> {room.roomId?.capacity}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-300">
                    <Building2 size={16} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[11px] font-black text-slate-800">Venue Only</p>
                      <p className="text-[9px] font-bold uppercase text-slate-400">No rooms</p>
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                      This booking has no room selected.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {roomList.length > 2 && (
              <button 
                onClick={() => setShowAllRooms(!showAllRooms)}
                className="w-full py-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                {showAllRooms ? (
                  <><ChevronUp size={12} /> Show Less</>
                ) : (
                  <><ChevronDown size={12} /> See All (+{roomList.length - 2} More)</>
                )}
              </button>
            )}
          </div>

          <div className="md:col-span-2 space-y-3">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Package Availed ({packagesList.length})</h3>
             
             {packagesList.length > 0 ? (
                <div className="space-y-2">
                  {visiblePackages.map((pkg, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-violet-50 rounded-2xl border border-violet-100 relative overflow-hidden group">
                      <Package className="absolute -right-4 -bottom-4 text-violet-100 opacity-50 rotate-12" size={80} />
                      
                      <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 border border-violet-200 relative z-10">
                        <Package size={24} />
                      </div>
                      
                      <div className="flex-grow relative z-10">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-black text-slate-800">{pkg?.name || "Package"}</p>
                        </div>
                        {pkg.description && (
                          <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {pkg?.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {packagesList.length > 1 && (
                    <button 
                      onClick={() => setShowAllPackages(!showAllPackages)}
                      className="w-full py-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-violet-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      {showAllPackages ? (
                        <><ChevronUp size={12} /> Show Less</>
                      ) : (
                        <><ChevronDown size={12} /> See All (+{packagesList.length - 1} More)</>
                      )}
                    </button>
                  )}
                </div>
             ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-slate-400 italic text-xs">
                   <div className="h-8 w-8 rounded-lg bg-slate-200/50 flex items-center justify-center">
                     <Package size={14} />
                   </div>
                   No additional package selected for this booking.
                </div>
             )}
          </div>

        </div>

        <div className="staff-billing-hidden flex justify-end border-t border-slate-100 bg-slate-50 p-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billing</p>
            <p className="text-xl font-black text-slate-900">₱{booking.totalPrice?.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionAlertModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  title,
  description,
  confirmLabel,
  reasonLabel,
  reasonPlaceholder,
  reasonValue,
  onReasonChange,
  reasonHelperText,
  reasonError,
  reasonRequired = false,
}) => {
  if (!isOpen) return null;

  const isConfirmDisabled =
    isSubmitting || (reasonRequired && !String(reasonValue || "").trim());

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)] animate-in zoom-in-95 duration-200">
        <div className="px-6 py-6">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
              <AlertCircle size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-400">
                Booking Action
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">
              Warning
            </p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700">
              Review this action carefully before proceeding.
            </p>
          </div>

          {typeof onReasonChange === "function" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="decline-reason"
                  className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500"
                >
                  {reasonLabel || "Reason"}
                </label>
                {reasonHelperText && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    {reasonHelperText}
                  </span>
                )}
              </div>
              <textarea
                id="decline-reason"
                value={reasonValue}
                onChange={onReasonChange}
                rows={4}
                maxLength={500}
                autoFocus
                placeholder={reasonPlaceholder}
                aria-invalid={Boolean(reasonError)}
                className={`mt-3 w-full resize-none rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100 ${
                  reasonError ? "border-rose-300" : "border-slate-200"
                }`}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={`text-xs ${reasonError ? "text-rose-500" : "text-slate-400"}`}>
                  {reasonError || "Share a short explanation with the guest."}
                </p>
                <span className="text-[11px] font-semibold text-slate-400">
                  {String(reasonValue || "").length}/500
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {isSubmitting ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export const BookingsPage = ({
  bookingsSource = [],
  backendUrl = "",
  pageTitle = "All Bookings",
  pageSubtitle = "Manage and track guest reservations",
  bookingsPerPage = DEFAULT_BOOKINGS_PER_PAGE,
  showBilling = true,
  onApproveBooking,
  onDeclineBooking,
  onConfirmPayment,
  onResolveCancellation,
  onProcessRefund,
  onUpdateStayStatus,
}) => {
  const location = useLocation();
  const resolvedBookingsPerPage = Math.max(
    1,
    Number(bookingsPerPage) || DEFAULT_BOOKINGS_PER_PAGE
  );

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [actionReasonError, setActionReasonError] = useState("");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const filterRef = useRef(null);
  const archivedSectionRef = useRef(null);
  const [flashBookingId, setFlashBookingId] = useState(null);
  const handledFlashRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStayActionKey, setActiveStayActionKey] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [archiveFilter, setArchiveFilter] = useState("All Bookings");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All Room Types");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [yearFilter, setYearFilter] = useState("All Years");

  const months = Array.from({ length: 12 }, (_, i) => getMonthLabelPHT(i));
  const years = Array.from({ length: 5 }, (_, i) => getCurrentPHYear() - 2 + i);
  const archivedFilteredBookings = filteredBookings.filter(
    (booking) => getBookingArchiveStatus(booking) === "archived"
  );
  const activeFilteredBookings = filteredBookings.filter(
    (booking) => getBookingArchiveStatus(booking) !== "archived"
  );
  const visibleBookings =
    archiveFilter === "Archived"
      ? archivedFilteredBookings
      : archiveFilter === "Active"
        ? activeFilteredBookings
        : filteredBookings;
  const emptyBookingsMessage =
    archiveFilter === "Archived"
      ? "No archived bookings match the current filters."
      : archiveFilter === "Active"
        ? "No active bookings match the current filters."
        : "No results found matching your filters.";
  const directoryLabel = archiveFilter === "Archived" ? "Archived Directory" : "Booking Directory";
  const totalPages = Math.max(1, Math.ceil(visibleBookings.length / resolvedBookingsPerPage));
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
  const pageStartIndex = (currentPageSafe - 1) * resolvedBookingsPerPage;
  const paginatedBookings = visibleBookings.slice(
    pageStartIndex,
    pageStartIndex + resolvedBookingsPerPage
  );
  const pageStart = visibleBookings.length === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = Math.min(pageStartIndex + resolvedBookingsPerPage, visibleBookings.length);
  const sortOptions = [
    { value: "Newest First", label: "Newest First" },
    { value: "Oldest First", label: "Oldest First" },
  ];
  const archiveOptions = [
    { value: "All Bookings", label: "All Bookings" },
    { value: "Active", label: "Active" },
    { value: "Archived", label: "Archived" },
  ];
  const buildingOptions = [
    { value: "All Buildings", label: "All Buildings" },
    ...Array.from(
      new Set(
        (bookings || [])
          .flatMap((booking) => booking.bookingItems || [])
          .map((item) => getBookingBuilding(item))
          .filter(Boolean)
      )
    )
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value })),
  ];
  const roomTypeOptions = [
    { value: "All Room Types", label: "All Room Types" },
    ...Array.from(
      new Set(
        (bookings || [])
          .flatMap((booking) => booking.bookingItems || [])
          .map((item) => getBookingRoomType(item))
          .filter(Boolean)
      )
    )
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value })),
  ];
  const statusOptions = [
    { value: "All Status", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "awaitingCheckIn", label: "Awaiting Check-In" },
    { value: "checkedIn", label: "Checked In" },
    { value: "checkedOut", label: "Checked Out" },
    { value: "noShow", label: "No-Show" },
    { value: "cancelled", label: "Cancelled" },
    { value: "cancellation_pending", label: "Cancel Pending" },
    { value: "declined", label: "Declined" },
  ];
  const monthOptions = [
    { value: "All Months", label: "All Months" },
    ...months.map((month) => ({ value: month, label: month })),
  ];
  const yearOptions = [
    { value: "All Years", label: "All Years" },
    ...years.map((year) => ({ value: year, label: String(year) })),
  ];

  useEffect(() => {
    setBookings(Array.isArray(bookingsSource) ? bookingsSource : []);
  }, [bookingsSource]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsDateFilterActive(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDatePHT = (dateInput) => {
    return formatDatePHTValue(dateInput) || "N/A";
  };

  const triggerBookingFlash = (bookingId) => {
    if (!bookingId) return;
    setFlashBookingId(null);
    setTimeout(() => setFlashBookingId(`booking-${bookingId}`), 0);
  };

  const resetActionAlertState = () => {
    setActionAlert(null);
    setActionReason("");
    setActionReasonError("");
  };

  const closeActionAlert = () => {
    if (isActionSubmitting) return;
    resetActionAlertState();
  };

  const handleActionReasonChange = (event) => {
    setActionReason(event.target.value);
    if (actionReasonError) {
      setActionReasonError("");
    }
  };

  const handleActionAlertConfirm = async () => {
    if (!actionAlert?.bookingId) return;

    const trimmedReason = String(actionReason || "").trim();

    if (actionAlert.requiresReason && !trimmedReason) {
      setActionReasonError("Please enter a reason before declining this booking.");
      return;
    }

    setIsActionSubmitting(true);

    try {
      let actionSucceeded = true;

      if (actionAlert.type === "decline-booking" && typeof onDeclineBooking === "function") {
        actionSucceeded = await onDeclineBooking(actionAlert.bookingId, trimmedReason);
      }

      if (actionSucceeded !== false) {
        resetActionAlertState();
      }
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleStayAction = async (bookingId, action) => {
    if (typeof onUpdateStayStatus !== "function") return;

    const actionKey = `${bookingId}:${action}`;
    setActiveStayActionKey(actionKey);

    try {
      await onUpdateStayStatus(bookingId, action);
    } finally {
      setActiveStayActionKey("");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flashParam = params.get("flash");
    const bookingIdParam = params.get("bookingId");
    const stateBookingId = location.state?.bookingId;
    const hasFlash = Boolean(flashParam || location.state?.flashNonce);
    const resolvedBookingId = bookingIdParam || stateBookingId;

    if (!resolvedBookingId || !hasFlash) return;
    const flashKey = flashParam || location.state?.flashNonce;
    if (handledFlashRef.current === flashKey) return;
    handledFlashRef.current = flashKey;

    setSearchTerm("");
    setBuildingFilter("All Buildings");
    setStatusFilter("All Status");
    setRoomTypeFilter("All Room Types");
    setSortOrder("Newest First");
    setStartDate("");
    setEndDate("");
    setMonthFilter("All Months");
    setYearFilter("All Years");
    triggerBookingFlash(resolvedBookingId);

    if (flashParam) {
      params.delete("flash");
      const cleanedSearch = params.toString();
      const cleanedUrl = `${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}`;
      window.history.replaceState(window.history.state, "", cleanedUrl);
    }
  }, [location.search, location.state]);

  useEffect(() => {
    if (!flashBookingId) return;
    const bookingId = flashBookingId.replace("booking-", "");
    const bookingIndex = visibleBookings.findIndex((booking) => booking._id === bookingId);
    if (bookingIndex >= 0) {
      const targetPage = Math.floor(bookingIndex / resolvedBookingsPerPage) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
        return;
      }
    }

    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(() => {
      const element = document.getElementById(flashBookingId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
      attempts += 1;
    }, 250);
    return () => clearInterval(interval);
  }, [flashBookingId, visibleBookings, currentPage, resolvedBookingsPerPage]);

  useEffect(() => {
    if (!Array.isArray(bookings)) return;
    let filtered = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((b) => {
        const guestFullName = `${b.userId?.firstName || ""} ${b.userId?.lastName || ""}`
          .trim()
          .toLowerCase();
        const guestDisplayName = String(b.userId?.name || guestFullName).toLowerCase();
        const guestEmail = String(b.userId?.email || "").toLowerCase();
        const bookingId = String(b._id || "").toLowerCase();
        const bookingName = String(b.bookingName || "").toLowerCase();

        return (
          guestFullName.includes(term) ||
          guestDisplayName.includes(term) ||
          guestEmail.includes(term) ||
          bookingId.includes(term) ||
          bookingName.includes(term)
        );
      });
    }
    
    if (buildingFilter !== "All Buildings") filtered = filtered.filter(b => b.bookingItems?.some(r => getBookingBuilding(r) === buildingFilter));
    
    if (statusFilter !== "All Status") {
      filtered = filtered.filter((b) => matchesBookingStatusFilter(b, statusFilter));
    }

    if (roomTypeFilter !== "All Room Types") {
      filtered = filtered.filter(b => b.bookingItems?.some(r => getBookingRoomType(r).toLowerCase() === roomTypeFilter.toLowerCase()));
    }

    if (startDate || endDate) {
      filtered = filtered.filter(b => {
        const bDate = getPHDateValue(getBookingCheckInDateValue(b));
        if (!bDate) return false;
        return (!startDate || bDate >= startDate) && (!endDate || bDate <= endDate);
      });
    }
    
    if (monthFilter !== "All Months") {
      filtered = filtered.filter((b) => getPHMonthIndex(getBookingCheckInDateValue(b)) === months.indexOf(monthFilter));
    }
    if (yearFilter !== "All Years") {
      filtered = filtered.filter((b) => getPHYear(getBookingCheckInDateValue(b)) === parseInt(yearFilter));
    }

    filtered.sort((a, b) => {
        const dateA = getBookingRequestTimestamp(a);
        const dateB = getBookingRequestTimestamp(b);
        return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
    });

    setFilteredBookings(filtered);
  }, [searchTerm, buildingFilter, statusFilter, roomTypeFilter, sortOrder, startDate, endDate, monthFilter, yearFilter, bookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, archiveFilter, buildingFilter, statusFilter, roomTypeFilter, sortOrder, startDate, endDate, monthFilter, yearFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleStartDateChange = (value) => {
    setDateRangeError("");
    setStartDate(value);
    setMonthFilter("All Months");

    if (value && endDate && endDate < value) {
      setEndDate("");
      setDateRangeError("Check out must not be earlier than check in.");
    }
  };

  const handleEndDateChange = (value) => {
    if (value && startDate && value < startDate) {
      setDateRangeError("Check out must not be earlier than check in.");
      return;
    }

    setDateRangeError("");
    setEndDate(value);
    setMonthFilter("All Months");
  };

  const renderBookingActionButtons = (b) => (
    <>
      {b.status?.toLowerCase() === "pending" && typeof onApproveBooking === "function" && (
        <>
          <button
            onClick={() => onApproveBooking(b._id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-500 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-emerald-200 transition-all active:scale-[0.98] hover:bg-emerald-600"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          {typeof onDeclineBooking === "function" && (
            <button
              onClick={() => {
                setActionReason("");
                setActionReasonError("");
                setActionAlert({
                  type: "decline-booking",
                  bookingId: b._id,
                  title: "Decline Booking Request",
                  description:
                    "Add a short reason for the guest before declining this booking request.",
                  confirmLabel: "Decline Booking",
                  requiresReason: true,
                  reasonLabel: "Reason for decline",
                  reasonPlaceholder:
                    "Example: The requested room is no longer available for the selected dates.",
                  reasonHelperText: "Shown to the guest",
                });
              }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-500 transition-all hover:bg-rose-50"
            >
              <X size={12} />
              Decline
            </button>
          )}
        </>
      )}

      {b.status?.toLowerCase() === "approved" &&
        typeof onConfirmPayment === "function" &&
        Number(b.pendingPaymentAmount || 0) > 0 &&
        (b.paymentMethod === "cash" || b.paymentMethod === "gcash") && (
          <button
            onClick={() => onConfirmPayment(b._id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-indigo-600 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-indigo-100 transition-all hover:bg-indigo-700"
          >
            <Banknote size={12} />
            Confirm ₱{Number(b.pendingPaymentAmount || 0).toLocaleString()}
          </button>
        )}

      {typeof onUpdateStayStatus === "function" && getAvailableStayActions(b).canConfirmCheckIn && (
        <button
          type="button"
          onClick={() => handleStayAction(b._id, "checkIn")}
          disabled={activeStayActionKey === `${b._id}:checkIn`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          <CheckCircle2 size={12} />
          {activeStayActionKey === `${b._id}:checkIn` ? "Saving..." : "Check-In"}
        </button>
      )}

      {typeof onUpdateStayStatus === "function" && getAvailableStayActions(b).canMarkNoShow && (
        <button
          type="button"
          onClick={() => handleStayAction(b._id, "noShow")}
          disabled={activeStayActionKey === `${b._id}:noShow`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-500 transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300"
        >
          <XCircle size={12} />
          {activeStayActionKey === `${b._id}:noShow` ? "Saving..." : "No-Show"}
        </button>
      )}

      {typeof onUpdateStayStatus === "function" && getAvailableStayActions(b).canConfirmCheckOut && (
        <button
          type="button"
          onClick={() => handleStayAction(b._id, "checkOut")}
          disabled={activeStayActionKey === `${b._id}:checkOut`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-600 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-sky-100 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          <CheckCircle2 size={12} />
          {activeStayActionKey === `${b._id}:checkOut` ? "Saving..." : "Check-Out"}
        </button>
      )}

      {b.status?.toLowerCase() === "cancellation_pending" && typeof onResolveCancellation === "function" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onResolveCancellation(b._id, "approve")}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-rose-600 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-rose-100 transition-all active:scale-[0.98] hover:bg-rose-700"
          >
            <Trash2 size={12} />
            Approve
          </button>
          <button
            onClick={() => onResolveCancellation(b._id, "reject")}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-all hover:bg-slate-50"
          >
            <X size={12} />
            Decline
          </button>
        </div>
        )}
      {b.status?.toLowerCase() === "cancelled" &&
        typeof onProcessRefund === "function" &&
        b.refundEligible &&
        Number(b.refundableAmount || 0) > 0 &&
        !isRefundProcessed(b) && (
          <button
            onClick={() => onProcessRefund(b._id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-emerald-100 transition-all hover:bg-emerald-700"
          >
            <RotateCcw size={12} />
            Refund ₱{Number(b.refundableAmount || 0).toLocaleString()}
          </button>
        )}

      {b.status?.toLowerCase() === "cancelled" && isRefundProcessed(b) && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
          <CheckCircle2 size={12} />
          Refunded
        </span>
      )}
    </>
  );

  const scrollToArchivedSection = () => {
    archivedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`flex h-full min-h-0 w-full flex-col bg-[#f8fafc] px-3 pt-4 pb-0 font-sans md:px-4 md:pt-5 md:pb-0 xl:px-5 ${showBilling ? "" : "[&_.staff-billing-hidden]:hidden"}`}>
      <style>{`
        @keyframes bookingFlashRow {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.12); }
        }
        .booking-flash td {
          animation: bookingFlashRow 0.9s ease-in-out 0s 3;
        }
      `}</style>
      
      {/* HEADER SECTION */}
      <div className="mb-7 w-full">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-[2.35rem]">{pageTitle}</h1>
            <p className="mt-1.5 text-[15px] font-medium text-slate-500">{pageSubtitle}</p>
          </div>
          
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <div 
              onClick={() => setIsDateFilterActive(!isDateFilterActive)}
              className={`flex min-h-[46px] w-full cursor-pointer items-center gap-3 rounded-[20px] border bg-white px-4 py-2.5 shadow-sm transition-all sm:w-auto sm:px-5 ${isDateFilterActive ? 'border-blue-600 ring-4 ring-blue-600/5' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <CalendarDays size={18} className={isDateFilterActive ? "text-blue-600" : "text-slate-400"} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-0.5 text-[10px] font-normal uppercase leading-none tracking-[0.14em] text-slate-400">Stay Period</span>
                <span className="truncate text-[13px] font-normal text-slate-700">
                  {startDate ? `${startDate} → ${endDate || '...'}` : monthFilter !== "All Months" ? `${monthFilter} ${yearFilter}` : "Select Date range"}
                </span>
              </div>
              <ChevronDown size={15} className={`ml-1 shrink-0 transition-transform duration-300 sm:ml-2 ${isDateFilterActive ? 'rotate-180 text-blue-600' : 'text-slate-300'}`} />
            </div>

            {isDateFilterActive && (
              <div className="absolute right-0 z-[100] mt-2 w-[min(320px,calc(100vw-1.5rem))] rounded-[28px] border border-slate-100 bg-white p-4 shadow-2xl animate-in zoom-in-95 duration-200 sm:w-[320px]">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-[9px] font-normal uppercase tracking-widest text-slate-400">Calendar Range</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative rounded-lg border border-slate-100 bg-slate-50 p-1.5 transition-all focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10">
                            <span className="block px-1 text-[9px] font-normal text-slate-400">Check In</span>
                            <input type="date" className="w-full cursor-pointer bg-transparent p-1 text-[11px] font-normal text-slate-700 outline-none" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                        <div className="relative rounded-lg border border-slate-100 bg-slate-50 p-1.5 transition-all focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10">
                            <span className="block px-1 text-[9px] font-normal text-slate-400">Check Out</span>
                            <input type="date" className="w-full cursor-pointer bg-transparent p-1 text-[11px] font-normal text-slate-700 outline-none" value={endDate} min={startDate} onChange={(e) => handleEndDateChange(e.target.value)} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                    </div>
                    {dateRangeError && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-[9px] font-normal text-rose-600">
                        <AlertCircle size={12} />
                        <span>{dateRangeError}</span>
                      </div>
                    )}
                  </div>
                  <div className="relative flex items-center"><div className="flex-grow border-t border-slate-100"></div><span className="px-3 text-[9px] font-normal uppercase tracking-[0.18em] text-slate-300">Or Quick Select</span><div className="flex-grow border-t border-slate-100"></div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterDropdown
                      label="Month"
                      options={monthOptions}
                      value={monthFilter}
                      onChange={(value) => {
                        setDateRangeError("");
                        setMonthFilter(value);
                        setStartDate("");
                        setEndDate("");
                      }}
                      icon={CalendarDays}
                      neutralValue="All Months"
                      align="left"
                      showMenuHeader={false}
                      compact
                      triggerClassName="w-full"
                      menuClassName="w-full min-w-[150px]"
                    />
                    <FilterDropdown
                      label="Year"
                      options={yearOptions}
                      value={yearFilter}
                      onChange={(value) => {
                        setDateRangeError("");
                        setYearFilter(value);
                        setStartDate("");
                        setEndDate("");
                      }}
                      icon={CalendarDays}
                      neutralValue="All Years"
                      align="left"
                      showMenuHeader={false}
                      compact
                      triggerClassName="w-full"
                      menuClassName="w-full min-w-[150px]"
                    />
                  </div>
                  <button onClick={() => {setStartDate(""); setEndDate(""); setDateRangeError(""); setMonthFilter("All Months"); setYearFilter("All Years"); setIsDateFilterActive(false);}} className="w-full rounded-[16px] bg-slate-900 py-2.5 text-[11px] font-normal text-white transition-all shadow-lg shadow-slate-200 hover:bg-slate-800">Reset & Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* SEARCH AND FILTERS */}
      <div className="mb-6 w-full">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative w-full lg:w-[320px] xl:w-[360px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Search Guest..." 
                className="h-10 w-full rounded-[20px] border border-slate-200 bg-white pl-10 pr-4 text-[12px] font-normal outline-none shadow-sm"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <FilterDropdown
              label="Archive"
              options={archiveOptions}
              value={archiveFilter}
              onChange={setArchiveFilter}
              icon={Layers}
              neutralValue="All Bookings"
              compact
              triggerClassName="w-full justify-between bg-white sm:w-auto sm:min-w-[152px]"
              menuClassName="w-full sm:w-52"
            />
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
            <FilterDropdown
              label="Sort"
              options={sortOptions}
              value={sortOrder}
              onChange={setSortOrder}
              icon={ArrowUpDown}
              neutralValue="Newest First"
              compact
              triggerClassName="w-full justify-between bg-white sm:w-auto sm:min-w-[150px]"
              menuClassName="w-full sm:w-52"
            />
            <FilterDropdown
              label="Building"
              options={buildingOptions}
              value={buildingFilter}
              onChange={setBuildingFilter}
              icon={Building2}
              neutralValue="All Buildings"
              compact
              triggerClassName="w-full justify-between bg-white sm:w-auto sm:min-w-[164px]"
              menuClassName="w-full sm:w-56"
            />
            <FilterDropdown
              label="Room Type"
              options={roomTypeOptions}
              value={roomTypeFilter}
              onChange={setRoomTypeFilter}
              icon={Home}
              neutralValue="All Room Types"
              compact
              triggerClassName="w-full justify-between bg-white sm:w-auto sm:min-w-[192px]"
              menuClassName="w-full sm:w-64"
            />
            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={AlertCircle}
              neutralValue="All Status"
              compact
              triggerClassName="w-full justify-between bg-white sm:w-auto sm:min-w-[150px]"
              menuClassName="w-full sm:w-52"
            />
            <button onClick={() => { setSearchTerm(""); setArchiveFilter("All Bookings"); setBuildingFilter("All Buildings"); setRoomTypeFilter("All Room Types"); setStatusFilter("All Status"); setSortOrder("Newest First"); setStartDate(""); setEndDate(""); setMonthFilter("All Months"); setYearFilter("All Years"); }} className="flex h-10 w-full items-center justify-center rounded-[20px] border border-slate-200 bg-slate-100 px-4 text-[12px] font-normal text-slate-500 transition-all hover:bg-slate-200 sm:w-auto">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="mb-8 flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-1 flex-col gap-2.5 p-3 lg:hidden">
          {visibleBookings.length > 0 ? (
            paginatedBookings.map((b) => (
              <div
                id={`booking-${b._id}`}
                key={b._id}
                className={`rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(250px,1fr)] sm:items-start">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm">
                    {b.userId?.image ? (
                      <img
                        src={b.userId.image.startsWith('http') ? b.userId.image : `${backendUrl}/${b.userId.image}`}
                        className="h-full w-full object-cover"
                        alt="user"
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black leading-tight text-slate-800">
                      {b.userId?.firstName} {b.userId?.lastName}
                    </p>
                    <div className="mt-1 flex items-start gap-1.5 text-[10px] font-bold text-slate-500">
                      <Mail size={10} className="mt-0.5 shrink-0 text-slate-300" />
                      <span className="break-all">{b.userId?.email || "No Email"}</span>
                    </div>
                    {b.userId?.authProvider !== "google" && (
                      <div className="mt-1 flex items-start gap-1.5 text-[10px] font-bold text-slate-400">
                        <Phone size={10} className="mt-0.5 shrink-0 text-slate-300" />
                        <span>{b.userId?.phone || "No Phone"}</span>
                      </div>
                    )}
                  </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Booking Details</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <BookingUnitPreview booking={b} variant="card" />
                      </div>
                    <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="mt-2 flex w-fit items-center gap-1 text-[8px] font-black uppercase tracking-[0.12em] text-blue-600 hover:text-blue-700 hover:underline">
                      <Info size={9} /> Details
                    </button>
                  </div>

                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5 shadow-sm shadow-slate-100/60">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Current Status</p>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {shouldShowBookingStatus(b) && <StatusBadge status={b.status} />}
                        {shouldShowStayStatus(b) && <StayStatusBadge booking={b} />}
                      </div>
                      {shouldShowStayStatus(b) && getStayStatusDescription(b) && (
                        <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-500">
                          {getStayStatusDescription(b)}
                        </p>
                      )}
                    </div>

                    <div className="staff-billing-hidden rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Billing</p>
                    <p className="mt-1 text-sm font-black text-slate-800">â‚±{b.totalPrice?.toLocaleString()}</p>
                    <PaymentStatusIndicator
                      booking={b}
                      size={9}
                      className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
                    />
                    <p className="mt-1 text-[8px] font-semibold text-slate-500">
                      Paid: ₱{Number(b.amountPaid || 0).toLocaleString()}
                    </p>
                    {getRefundStatusLabel(b) && (
                      <p className="mt-1 text-[8px] font-semibold text-rose-600">
                        {getRefundStatusLabel(b)}
                      </p>
                    )}
                  </div>

                    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:justify-start">
                      {renderBookingActionButtons(b)}
                    </div>
                </div>
              </div>
            </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <Search size={32} className="opacity-50" />
                <p className="text-sm font-bold">{emptyBookingsMessage}</p>
              </div>
            </div>
          )}
        </div>

        <div className="hidden flex-1 overflow-auto lg:block">
          <table className="w-full min-w-[1220px] table-fixed text-left">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
              <tr>
                <th className="w-[30%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Guest Profile</th>
                <th className="w-[23%] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Booking Details</th>
                <th className="w-[17%] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Current Status</th>
                <th className="w-[20%] px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Actions</th>
                <th className="staff-billing-hidden w-[10%] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Billing & Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleBookings.length > 0 ? paginatedBookings.map((b) => (
                <tr
                  id={`booking-${b._id}`}
                  key={b._id}
                  className={`hover:bg-slate-50/50 transition-colors group ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm">
                        {b.userId?.image ? <img src={b.userId.image.startsWith('http') ? b.userId.image : `${backendUrl}/${b.userId.image}`} className="w-full h-full object-cover" alt="user" /> : <User size={16}/>}
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <p className="text-[14px] font-semibold text-slate-800 leading-tight">{b.userId?.firstName} {b.userId?.lastName}</p>
                        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-normal text-slate-500">
                          <Mail size={10} className="shrink-0 text-slate-300"/>
                          <span className="break-all leading-relaxed">{b.userId?.email || "No Email"}</span>
                        </div>
                        {b.userId?.authProvider !== "google" && (
                          <div className="flex items-center gap-1.5 text-[10px] font-normal text-slate-400">
                            <Phone size={10} className="shrink-0 text-slate-300"/>
                            <span>{b.userId?.phone || "No Phone"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col items-start gap-2 text-left">
                      <div className="flex max-w-[340px] flex-wrap items-center gap-1.5">
                        <BookingUnitPreview booking={b} variant="table" />
                      </div>
                      <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="mt-0.5 flex w-fit items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-600 hover:text-blue-700 hover:underline">
                        <Info size={10}/> View Full Details
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex max-w-[220px] flex-col items-start gap-2">
                      {shouldShowBookingStatus(b) && <StatusBadge status={b.status} />}
                      {shouldShowStayStatus(b) && <StayStatusBadge booking={b} />}
                      {shouldShowStayStatus(b) && getStayStatusDescription(b) && (
                        <p className="text-[10px] font-normal leading-relaxed text-slate-500">
                          {getStayStatusDescription(b)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-nowrap items-center justify-center gap-2.5 whitespace-nowrap">
                      {renderBookingActionButtons(b)}
                    </div>
                  </td>
                  <td className="staff-billing-hidden px-5 py-4 align-top">
                    <div className="flex flex-col items-start text-left">
                      <p className="text-[18px] font-black text-slate-800">₱{b.totalPrice?.toLocaleString()}</p>
                      <PaymentStatusIndicator
                        booking={b}
                        size={10}
                        className="mt-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                      />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="opacity-50" />
                      <p className="text-sm font-bold">{emptyBookingsMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full text-left sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">{directoryLabel}</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-800">
              Showing {pageStart}-{pageEnd} of {visibleBookings.length} bookings
            </p>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPageSafe === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {visiblePageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-[10px] font-bold transition ${
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
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPageSafe === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {false && (
        <div ref={archivedSectionRef} className="mb-8 flex flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2.5 p-3 lg:hidden">
            {archivedFilteredBookings.map((b) => (
              <div
                id={`booking-${b._id}`}
                key={`archived-${b._id}`}
                className={`rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(250px,1fr)] sm:items-start">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm">
                        {b.userId?.image ? (
                          <img
                            src={b.userId.image.startsWith("http") ? b.userId.image : `${backendUrl}/${b.userId.image}`}
                            className="h-full w-full object-cover"
                            alt="user"
                          />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-black leading-tight text-slate-800">
                          {b.userId?.firstName} {b.userId?.lastName}
                        </p>
                        <div className="mt-1 flex items-start gap-1.5 text-[10px] font-bold text-slate-500">
                          <Mail size={10} className="mt-0.5 shrink-0 text-slate-300" />
                          <span className="break-all">{b.userId?.email || "No Email"}</span>
                        </div>
                        {b.userId?.authProvider !== "google" && (
                          <div className="mt-1 flex items-start gap-1.5 text-[10px] font-bold text-slate-400">
                            <Phone size={10} className="mt-0.5 shrink-0 text-slate-300" />
                            <span>{b.userId?.phone || "No Phone"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Booking Details</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <BookingUnitPreview booking={b} variant="card" />
                      </div>
                      <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="mt-2 flex w-fit items-center gap-1 text-[8px] font-black uppercase tracking-[0.12em] text-blue-600 hover:text-blue-700 hover:underline">
                        <Info size={9} /> Details
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5 shadow-sm shadow-slate-100/60">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Archived Status</p>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {shouldShowBookingStatus(b) && <StatusBadge status={b.status} />}
                        {shouldShowStayStatus(b) && <StayStatusBadge booking={b} />}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Billing</p>
                      <p className="mt-1 text-sm font-black text-slate-800">₱{b.totalPrice?.toLocaleString()}</p>
                      <PaymentStatusIndicator
                        booking={b}
                        size={9}
                        className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1120px] table-fixed text-left">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="w-[32%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Guest Profile</th>
                  <th className="w-[28%] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Booking Details</th>
                  <th className="w-[20%] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Archived Status</th>
                  <th className="w-[20%] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Billing & Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {archivedFilteredBookings.map((b) => (
                  <tr
                    id={`booking-${b._id}`}
                    key={`archived-row-${b._id}`}
                    className={`group transition-colors hover:bg-slate-50/50 ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm">
                          {b.userId?.image ? <img src={b.userId.image.startsWith("http") ? b.userId.image : `${backendUrl}/${b.userId.image}`} className="w-full h-full object-cover" alt="user" /> : <User size={16} />}
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <p className="text-[14px] font-semibold leading-tight text-slate-800">{b.userId?.firstName} {b.userId?.lastName}</p>
                          <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-normal text-slate-500">
                            <Mail size={10} className="shrink-0 text-slate-300" />
                            <span className="break-all leading-relaxed">{b.userId?.email || "No Email"}</span>
                          </div>
                          {b.userId?.authProvider !== "google" && (
                            <div className="flex items-center gap-1.5 text-[10px] font-normal text-slate-400">
                              <Phone size={10} className="shrink-0 text-slate-300" />
                              <span>{b.userId?.phone || "No Phone"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col items-start gap-2 text-left">
                        <div className="flex max-w-[340px] flex-wrap items-center gap-1.5">
                          <BookingUnitPreview booking={b} variant="table" />
                        </div>
                        <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="mt-0.5 flex w-fit items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-600 hover:text-blue-700 hover:underline">
                          <Info size={10} /> View Full Details
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex max-w-[220px] flex-col items-start gap-2">
                        {shouldShowBookingStatus(b) && <StatusBadge status={b.status} />}
                        {shouldShowStayStatus(b) && <StayStatusBadge booking={b} />}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col items-start text-left">
                        <p className="text-[18px] font-black text-slate-800">₱{b.totalPrice?.toLocaleString()}</p>
                        <PaymentStatusIndicator
                          booking={b}
                          size={10}
                          className="mt-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Archived Directory</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-800">
              Showing 1-{archivedFilteredBookings.length} of {archivedFilteredBookings.length} bookings
            </p>
          </div>
        </div>
      )}

      <BookingDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} booking={selectedBooking} formatDate={formatDatePHT} backendUrl={backendUrl} />
      <ActionAlertModal
        isOpen={Boolean(actionAlert)}
        onClose={closeActionAlert}
        onConfirm={handleActionAlertConfirm}
        isSubmitting={isActionSubmitting}
        title={actionAlert?.title}
        description={actionAlert?.description}
        confirmLabel={actionAlert?.confirmLabel}
        reasonLabel={actionAlert?.reasonLabel}
        reasonPlaceholder={actionAlert?.reasonPlaceholder}
        reasonValue={actionReason}
        onReasonChange={actionAlert?.requiresReason ? handleActionReasonChange : undefined}
        reasonHelperText={actionAlert?.reasonHelperText}
        reasonError={actionReasonError}
        reasonRequired={actionAlert?.requiresReason}
      />
    </div>
  );
};

const AllBookings = () => {
  const {
    aToken,
    allBookings,
    getAllBookings,
    approveBooking,
    declineBooking,
    paymentConfirmed,
    approveCancellation,
    processRefund,
    updateBookingStayStatus,
    backendUrl,
  } = useContext(AdminContext);

  useEffect(() => {
    if (aToken) getAllBookings();
  }, [aToken]);

  return (
    <BookingsPage
      bookingsSource={allBookings}
      backendUrl={backendUrl}
      pageTitle="All Bookings"
      pageSubtitle="Manage and track guest reservations"
      bookingsPerPage={DEFAULT_BOOKINGS_PER_PAGE}
      onApproveBooking={approveBooking}
      onDeclineBooking={declineBooking}
      onConfirmPayment={paymentConfirmed}
      onResolveCancellation={approveCancellation}
      onProcessRefund={processRefund}
      onUpdateStayStatus={updateBookingStayStatus}
    />
  );
};

export default AllBookings;
