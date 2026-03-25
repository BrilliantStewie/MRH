import bookingModel from "../models/bookingModel.js";
import packageModel from "../models/packageModel.js";
import roomModel from "../models/roomModel.js";
import Review from "../models/reviewModel.js";
import { createOrRefreshNotifications } from "../utils/notificationUtils.js";
import {
  attachReviewDataToBookings,
  buildBookingPopulate,
} from "../utils/dataConsistency.js";

/* ======================================================
   HELPER: Normalize Date
====================================================== */

const normalizeDate = (date)=>{
const d = new Date(date);
d.setHours(0,0,0,0);
return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const rangesOverlap = (startA, endA, startB, endB) => startA <= endB && endA >= startB;
const isRoomPackageType = (value) =>
  String(value || "").trim().toLowerCase() === "room package";
const isVenuePackageType = (value) =>
  String(value || "").trim().toLowerCase() === "venue package";

/* ======================================================
   CREATE BOOKING
====================================================== */

export const createBooking = async (req,res)=>{
try{

const userId = req.userId;

 const {
  bookingName,
  bookingItems = [],
  checkIn: providedCheckIn,
  checkOut: providedCheckOut,
  venueParticipants = 0,
  extraPackages: providedExtraPackages
 } = req.body;

 const checkIn = providedCheckIn;
 const checkOut = providedCheckOut;
 const extraPackagesInput = providedExtraPackages || [];
 const normalizedBookingItems = Array.isArray(bookingItems)
   ? bookingItems.map((item) => ({
       ...item,
       roomId: item.roomId,
       packageId: item.packageId,
       participants: Number(item.participants || 0)
     }))
    : [];

 if(!normalizedBookingItems.length && Number(venueParticipants) <= 0)
  return res.json({success:false,message:"Please add room selection or venue participants"});
  
 const extraPackages = Array.isArray(extraPackagesInput) ? extraPackagesInput : [];
 const uniqueRooms = [...new Set(normalizedBookingItems.map((item) => String(item.roomId || "")).filter(Boolean))];
 const uniquePackages = [...new Set(normalizedBookingItems.map((item) => String(item.packageId || "")).filter(Boolean))];
 const uniqueExtraPackages = [...new Set(extraPackages.map((item) => String(item || "")).filter(Boolean))];

 if (uniqueRooms.length !== normalizedBookingItems.length) {
   return res.json({ success: false, message: "Duplicate rooms are not allowed in one booking" });
 }

 const [roomDocs, packageDocs, extraPackageDocs] = await Promise.all([
   uniqueRooms.length
     ? roomModel.find({ _id: { $in: uniqueRooms } }).select("_id roomTypeId capacity available")
     : Promise.resolve([]),
   uniquePackages.length
     ? packageModel.find({ _id: { $in: uniquePackages } }).select("_id packageType roomTypeId price")
     : Promise.resolve([]),
   uniqueExtraPackages.length
     ? packageModel.find({ _id: { $in: uniqueExtraPackages } }).select("_id packageType roomTypeId price")
     : Promise.resolve([]),
 ]);

 if (roomDocs.length !== uniqueRooms.length) {
   return res.json({ success: false, message: "One or more selected rooms are invalid" });
 }

 if (packageDocs.length !== uniquePackages.length) {
   return res.json({ success: false, message: "Invalid package selected" });
 }

 if (extraPackageDocs.length !== uniqueExtraPackages.length) {
   return res.json({ success: false, message: "Invalid package selected" });
 }

 const roomById = new Map(roomDocs.map((room) => [String(room._id), room]));
 const packageById = new Map(packageDocs.map((pkg) => [String(pkg._id), pkg]));

 for (const item of normalizedBookingItems) {
   if (!item.roomId || !item.packageId || !item.participants) {
     return res.json({ success: false, message: "Each room selection must include a room, package, and participants" });
   }

   const room = roomById.get(String(item.roomId));
   const pkg = packageById.get(String(item.packageId));

   if (!room || room.available === false) {
     return res.json({ success: false, message: "One or more selected rooms are unavailable" });
   }

   if (!pkg || !isRoomPackageType(pkg.packageType)) {
     return res.json({ success: false, message: "Each selected room must use a valid room package" });
   }

   if (String(pkg.roomTypeId || "") !== String(room.roomTypeId || "")) {
     return res.json({ success: false, message: "Selected package does not match the room type" });
   }

   if (Number(item.participants) > Number(room.capacity || 0)) {
     return res.json({ success: false, message: "Selected participants exceed the room capacity" });
   }
 }

 if (extraPackageDocs.some((pkg) => isRoomPackageType(pkg.packageType))) {
   return res.json({
     success: false,
     message: "Room packages must be selected per room, not as extra packages"
   });
 }

 if (!normalizedBookingItems.length) {
   if (!extraPackageDocs.length) {
     return res.json({ success: false, message: "Please select a venue retreat package" });
   }
   const hasVenuePackage = extraPackageDocs.some((pkg) => isVenuePackageType(pkg.packageType));
   if (!hasVenuePackage) {
     return res.json({ success: false, message: "Please select a venue retreat package" });
   }
 }

/* ---------- NORMALIZE DATES ---------- */

const start=normalizeDate(checkIn);
const end=normalizeDate(checkOut);
const today=normalizeDate(new Date());

if(start < today)
return res.json({success:false,message:"Past dates not allowed"});

 if(end < start)
 return res.json({success:false,message:"Invalid date range"});

 if (end.getTime() === start.getTime() && normalizedBookingItems.length) {
  return res.json({ success: false, message: "Rooms are not available for same-day bookings" });
 }

  /* ---------- CHECK ROOM CONFLICT (WITH CLEANING DAY) ---------- */
  if (normalizedBookingItems.length) {
   const bookings = await bookingModel.find(
     {
        "bookingItems.roomId": { $in: uniqueRooms },
        status: { $in: ["pending", "approved"] }
     },
     "checkIn checkOut bookingItems"
    );

    const conflict = bookings.some((booking) => {
      const existingStart = normalizeDate(booking.checkIn);
      const existingEnd = normalizeDate(booking.checkOut);
      const cleaningEnd = normalizeDate(addDays(existingEnd, 1));
      return rangesOverlap(existingStart, cleaningEnd, start, end);
    });

   if (conflict) {
     return res.json({
       success: false,
       message: "One or more selected rooms are already booked (includes cleaning day)"
     });
   }
 }

/* ---------- CALCULATE PRICE ---------- */

const days = Math.ceil((end-start)/(1000*60*60*24)) || 1;

 let totalPrice = 0;

  for (const item of normalizedBookingItems){

 const pkg = packageById.get(String(item.packageId));

 if(!pkg)
  return res.json({success:false,message:"Invalid package selected"});

 const subtotal = pkg.price * item.participants * days;

 item.subtotal = subtotal;

 totalPrice += subtotal;

 }

 if (extraPackageDocs.length) {
   const participantsForExtras = normalizedBookingItems.length
     ? normalizedBookingItems.reduce((sum, item) => sum + Number(item.participants || 0), 0)
     : Number(venueParticipants) || 0;
 
   for (const pkg of extraPackageDocs) {
      totalPrice += pkg.price * participantsForExtras * days;
   }
 }

/* ---------- CREATE BOOKING ---------- */

const booking = await bookingModel.create({

userId,
 bookingName: String(bookingName || "").trim() || "Reservation",
 
  bookingItems: normalizedBookingItems,
  extraPackages: uniqueExtraPackages,
   venueParticipants: Number(venueParticipants) || 0,
 
checkIn:start,
checkOut:end,
 
 totalPrice,

status:"pending",
payment:false,
paymentStatus:"unpaid"

});

/* ---------- NOTIFY ADMINS ---------- */

const recipients = await bookingModel.db.model("User").find({ role: { $in: ["admin", "staff"] } });

const notifications = recipients.map(user=>({
recipient:user._id,
sender:userId,
type:"booking_update",
message:`Booking request received: ${bookingName}`,
link:`/admin/bookings?bookingId=${booking._id}`,
isRead:false
}));

if (notifications.length)
await createOrRefreshNotifications(notifications);

res.json({success:true,message:"Booking created successfully"});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   USER BOOKINGS
====================================================== */

export const userBookings = async (req,res)=>{
try{

let bookingsQuery = bookingModel
.find({ userId: req.userId })
.sort({ createdAt: -1 });

for (const populateConfig of buildBookingPopulate()) {
 bookingsQuery = bookingsQuery.populate(populateConfig);
}

const bookings = await bookingsQuery;
const normalizedBookings = await attachReviewDataToBookings(bookings);

res.json({success:true,bookings: normalizedBookings});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   CANCEL BOOKING
====================================================== */

export const cancelBooking = async (req,res)=>{
try{

const {bookingId}=req.body;

const booking = await bookingModel.findById(bookingId);

if(!booking)
return res.json({success:false,message:"Booking not found"});

if(String(booking.userId) !== req.userId)
return res.json({success:false,message:"Unauthorized"});

if(booking.status==="pending")
booking.status="cancelled";

else if(booking.status==="approved")
booking.status="cancellation_pending";

else
return res.json({success:false,message:"Cannot cancel booking"});

await booking.save();

res.json({success:true,message:"Booking cancelled"});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   MARK CASH PAYMENT
====================================================== */

export const markCash = async (req,res)=>{
try{

const {bookingId}=req.body;

const booking = await bookingModel.findById(bookingId);

if(!booking)
return res.json({success:false,message:"Booking not found"});

if(String(booking.userId) !== String(req.userId))
return res.json({success:false,message:"Unauthorized"});

if(booking.paymentStatus === "paid")
return res.json({success:false,message:"Booking is already marked as paid"});

booking.paymentMethod = "cash";
booking.paymentStatus = "pending";

await booking.save();

res.json({success:true,booking});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   VERIFY PAYMENT
====================================================== */

export const verifyPayment = async (req,res)=>{
try{

const {bookingId}=req.body;

const booking = await bookingModel.findById(bookingId);

if(!booking)
return res.json({success:false,message:"Booking not found"});

if(String(booking.userId) !== String(req.userId))
return res.json({success:false,message:"Unauthorized"});

if(booking.paymentStatus === "paid")
return res.json({success:true,message:"Payment already confirmed",booking});

if(booking.paymentMethod !== "gcash" || booking.paymentStatus !== "pending")
return res.json({success:false,message:"GCash checkout is not in a verifiable state"});

res.json({success:true,message:"Payment submitted. Awaiting admin confirmation.",booking});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   CREATE CHECKOUT SESSION
====================================================== */

export const createCheckoutSession = async (req,res)=>{
try{

res.json({
success:true,
message:"Online checkout session created"
});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   RATE BOOKING
====================================================== */

export const rateBooking = async (req,res)=>{
try{

const {bookingId,rating,review}=req.body;
const normalizedRating = Number(rating);
const normalizedComment = String(review || "").trim();

const booking = await bookingModel.findById(bookingId);

if(!booking)
return res.json({success:false,message:"Booking not found"});

if(String(booking.userId) !== String(req.userId))
return res.json({success:false,message:"Unauthorized"});

if (!normalizedRating || normalizedRating < 1 || normalizedRating > 5)
return res.json({success:false,message:"Please provide a rating between 1 and 5"});

let existingReview = await Review.findOne({ bookingId });

if (existingReview) {
 if (
   existingReview.rating !== normalizedRating ||
   existingReview.comment !== normalizedComment
 ) {
   existingReview.editHistory.push({
     rating: existingReview.rating,
     comment: existingReview.comment,
     editedAt: new Date()
   });
   existingReview.rating = normalizedRating;
   existingReview.comment = normalizedComment;
   existingReview.isEdited = true;
   existingReview.isHidden = false;
   await existingReview.save();
 }

 return res.json({success:true,message:"Thank you for your feedback!"});
}

await Review.create({
 bookingId,
 userId: req.userId,
 rating: normalizedRating,
 comment: normalizedComment,
 images: [],
 isHidden: false
});

res.json({success:true,message:"Thank you for your feedback!"});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   ADMIN REPLY REVIEW
====================================================== */

export const addReviewChat = async (req,res)=>{
try{

const {bookingId,message}=req.body;

if(!message || message.trim()==="")
return res.json({success:false,message:"Message empty"});

const review = await Review.findOne({ bookingId });

if(!review)
return res.json({success:false,message:"Review not found"});

const senderRole = req.userRole || req.role || "admin";

const chat = {
senderId: req.userId || req.user?.id || null,
senderRole,
message,
createdAt:new Date()
};

review.reviewChat.push(chat);

await review.save();

res.json({
success:true,
message:"Reply sent",
reviewChat:review.reviewChat
});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   CHECK AVAILABILITY
====================================================== */

export const checkAvailability = async (req,res)=>{
try{

const {roomIds=[],checkIn,checkOut}=req.body;

if (!roomIds.length || !checkIn || !checkOut) {
  return res.json({ success: true });
}

const start=normalizeDate(checkIn);
const end=normalizeDate(checkOut);

const uniqueRooms = roomIds;

const bookings = await bookingModel.find(
  {
    "bookingItems.roomId": { $in: uniqueRooms },
    status: { $in: ["pending", "approved"] }
  },
  "checkIn checkOut bookingItems"
);

const conflict = bookings.some((booking) => {
  const existingStart = normalizeDate(booking.checkIn);
  const existingEnd = normalizeDate(booking.checkOut);
  const cleaningEnd = normalizeDate(addDays(existingEnd, 1));
  return rangesOverlap(existingStart, cleaningEnd, start, end);
});

if(conflict)
return res.json({success:false,message:"Rooms unavailable (includes cleaning day)"});

res.json({success:true});

}catch(error){
res.json({success:false,message:error.message});
}
};


/* ======================================================
   GET UNAVAILABLE DATES
====================================================== */

export const getUnavailableDates = async (req,res)=>{
try{

const {roomIds=[]}=req.body;

const bookings = await bookingModel.find({
"bookingItems.roomId":{$in:roomIds},
status: { $in: ["pending", "approved"] }
});

const blockedDates=[];

bookings.forEach(b=>{

let current=new Date(b.checkIn);

const checkoutWithCleaning = new Date(b.checkOut);
checkoutWithCleaning.setDate(checkoutWithCleaning.getDate() + 1);

while(current <= checkoutWithCleaning){

blockedDates.push(new Date(current));

current.setDate(current.getDate()+1);

}

});

res.json({success:true,blockedDates});

}catch(error){
res.json({success:false,message:error.message});
}
};

/* ======================================================
   GET BOOKED ROOMS FOR DATE RANGE
====================================================== */

export const getBookedRoomsForRange = async (req, res) => {
try {
  const { roomIds = [], checkIn, checkOut } = req.body;

  if (!checkIn || !checkOut || !roomIds.length) {
    return res.json({ success: true, bookedRoomIds: [] });
  }

  const start = normalizeDate(checkIn);
  const end = normalizeDate(checkOut);

  if (end < start) {
    return res.json({ success: true, bookedRoomIds: [] });
  }

  const allowedIds = new Set(roomIds.map((id) => String(id)));

  const bookings = await bookingModel.find(
    {
      "bookingItems.roomId": { $in: roomIds },
      status: { $in: ["pending", "approved"] }
    },
    "checkIn checkOut bookingItems"
  );

  const bookedSet = new Set();
  const bookedReasons = new Map();
  bookings.forEach((booking) => {
    const existingStart = normalizeDate(booking.checkIn);
    const existingEnd = normalizeDate(booking.checkOut);
    const cleaningEnd = normalizeDate(addDays(existingEnd, 1));

    const isBookingOverlap = rangesOverlap(existingStart, existingEnd, start, end);
    const isCleaningOverlap = rangesOverlap(cleaningEnd, cleaningEnd, start, end);
    if (!isBookingOverlap && !isCleaningOverlap) return;

    (booking.bookingItems || []).forEach((item) => {
      const id = String(item.roomId);
      if (!allowedIds.has(id)) return;

      bookedSet.add(id);

      if (isBookingOverlap) {
        bookedReasons.set(id, "booked");
        return;
      }

      if (!bookedReasons.has(id)) {
        bookedReasons.set(id, "cleaning");
      }
    });
  });

  const bookedRooms = Array.from(bookedSet).map((roomId) => ({
    roomId,
    reason: bookedReasons.get(roomId) || "booked"
  }));

  res.json({
    success: true,
    bookedRoomIds: Array.from(bookedSet),
    bookedRooms
  });
} catch (error) {
  res.json({ success: false, message: error.message });
}
};

/* ======================================================
   GET CALENDAR AVAILABILITY (GUEST COUNTS)
====================================================== */

export const getCalendarAvailability = async (req, res) => {
try {
  const bookings = await bookingModel.find(
    { status: { $in: ["pending", "approved"] } },
    "checkIn checkOut bookingItems venueParticipants status paymentStatus"
  );

  const availability = bookings.map((b) => {
    const roomGuests = (b.bookingItems || []).reduce(
      (sum, item) => sum + Number(item.participants || 0),
      0
    );
    const venueGuests = Number(b.venueParticipants || 0);
    return {
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      paymentStatus: b.paymentStatus,
      guestCount: roomGuests + venueGuests
    };
  });

  res.json({ success: true, bookings: availability });
} catch (error) {
  res.json({ success: false, message: error.message });
}
};


/* ======================================================
   GET OCCUPIED ROOMS
====================================================== */

export const getOccupiedRooms = async (req,res)=>{
try{

const today = normalizeDate(new Date());

const bookings = await bookingModel.find({
status:"approved"
});

const occupiedRoomIds = [];
const cleaningRoomIds = [];

bookings.forEach(b => {

const checkin = normalizeDate(b.checkIn);
const checkout = normalizeDate(b.checkOut);

const cleaningDay = new Date(checkout);
cleaningDay.setDate(cleaningDay.getDate() + 1);

/* OCCUPIED */
if(today >= checkin && today < checkout){

b.bookingItems.forEach(item=>{
occupiedRoomIds.push(item.roomId);
});

}

/* CLEANING DAY */
if(today.getTime() === cleaningDay.getTime()){

b.bookingItems.forEach(item=>{
cleaningRoomIds.push(item.roomId);
});

}

});

res.json({
success:true,
occupiedRoomIds,
cleaningRoomIds
});

}catch(error){
res.json({success:false,message:error.message});
}
};

/* ======================================================
   GET USER BOOKED DATES
====================================================== */

export const getUserBookedDates = async (req,res)=>{
try{

 const bookings = await bookingModel.find({
 userId:req.userId,
 status:{$in:["pending","approved"]}
 });

const userBusyDates=[];

 bookings.forEach(b=>{

 const start = normalizeDate(b.checkIn);
 const end = normalizeDate(b.checkOut);

 if (start.getTime() === end.getTime()) {
   userBusyDates.push(new Date(start));
   return;
 }

 let current = new Date(start);

 while(current < end){

 userBusyDates.push(new Date(current));

 current.setDate(current.getDate()+1);

 }

 });

res.json({success:true,userBusyDates});

}catch(error){
res.json({success:false,message:error.message});
}
};


