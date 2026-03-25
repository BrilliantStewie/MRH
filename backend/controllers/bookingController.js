import bookingModel from "../models/bookingModel.js";
import Review from "../models/reviewModel.js";
import { createOrRefreshNotifications } from "../utils/notificationUtils.js";
import {
  attachReviewDataToBookings,
  buildBookingPopulate,
} from "../utils/dataConsistency.js";
import { createValidatedBooking } from "../utils/bookingService.js";
import {
  addDays,
  getBookingReviewEligibility,
  normalizeDate,
  rangesOverlap,
} from "../utils/bookingRules.js";

/* ======================================================
   CREATE BOOKING
====================================================== */

export const createBooking = async (req,res)=>{
try{

const userId = req.userId;

 const booking = await createValidatedBooking({
  userId,
  bookingName: req.body.bookingName,
  bookingItems: req.body.bookingItems || [],
  checkIn: req.body.checkIn,
  checkOut: req.body.checkOut,
  venueParticipants: req.body.venueParticipants || 0,
  extraPackages: req.body.extraPackages || [],
 });

/* ---------- NOTIFY ADMINS ---------- */

const recipients = await bookingModel.db.model("User").find({ role: { $in: ["admin", "staff"] } });

const notifications = recipients.map(user=>({
recipient:user._id,
sender:userId,
type:"booking_update",
message:`Booking request received: ${booking.bookingName || "Reservation"}`,
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

const reviewEligibility = getBookingReviewEligibility(booking);

if (!reviewEligibility.eligible)
return res.json({success:false,message:reviewEligibility.message});

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


