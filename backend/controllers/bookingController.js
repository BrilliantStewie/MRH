import bookingModel from "../models/bookingModel.js";
import packageModel from "../models/packageModel.js";
import Notification from "../models/notificationModel.js";

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

/* ======================================================
   CREATE BOOKING
====================================================== */

export const createBooking = async (req,res)=>{
try{

const userId = req.userId;

 const {
  bookingName,
  bookingItems=[],
  check_in,
  check_out,
  venueParticipants=0,
  extra_packages=[]
 } = req.body;

 if(!bookingItems.length && Number(venueParticipants) <= 0)
 return res.json({success:false,message:"Please add room selection or venue participants"});
 
 const extraPackages = Array.isArray(extra_packages) ? extra_packages : [];
 let extraPackageDocs = [];
 
 if (extraPackages.length) {
   extraPackageDocs = await packageModel.find({ _id: { $in: extraPackages } });
   if (extraPackageDocs.length !== extraPackages.length) {
     return res.json({ success: false, message: "Invalid package selected" });
   }
 }
 
 if (!bookingItems.length) {
   if (!extraPackages.length) {
     return res.json({ success: false, message: "Please select a venue retreat package" });
   }
   const hasVenuePackage = extraPackageDocs.some(
     (pkg) => pkg.packageType?.toLowerCase() === "venue package"
   );
   if (!hasVenuePackage) {
     return res.json({ success: false, message: "Please select a venue retreat package" });
   }
 }

/* ---------- NORMALIZE DATES ---------- */

const start=normalizeDate(check_in);
const end=normalizeDate(check_out);
const today=normalizeDate(new Date());

if(start < today)
return res.json({success:false,message:"Past dates not allowed"});

 if(end < start)
 return res.json({success:false,message:"Invalid date range"});

 if (end.getTime() === start.getTime() && bookingItems.length) {
  return res.json({ success: false, message: "Rooms are not available for same-day bookings" });
 }

 /* ---------- CHECK ROOM CONFLICT (WITH CLEANING DAY) ---------- */
 if (bookingItems.length) {
   const uniqueRooms = bookingItems.map(item => item.room_id);

   const bookings = await bookingModel.find(
     {
       "bookingItems.room_id": { $in: uniqueRooms },
       status: { $in: ["pending", "approved"] }
     },
     "check_in check_out bookingItems"
   );

   const conflict = bookings.some((booking) => {
     const existingStart = normalizeDate(booking.check_in);
     const existingEnd = normalizeDate(booking.check_out);
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

 let total_price = 0;

 for (const item of bookingItems){

 const pkg = await packageModel.findById(item.package_id);

 if(!pkg)
 return res.json({success:false,message:"Invalid package selected"});

 const subtotal = pkg.price * item.participants * days;

 item.subtotal = subtotal;

 total_price += subtotal;

 }

 if (extraPackageDocs.length) {
   const participantsForExtras = bookingItems.length
     ? bookingItems.reduce((sum, item) => sum + Number(item.participants || 0), 0)
     : Number(venueParticipants) || 0;
 
   for (const pkg of extraPackageDocs) {
     total_price += pkg.price * participantsForExtras * days;
   }
 }

/* ---------- CREATE BOOKING ---------- */

const booking = await bookingModel.create({

user_id:userId,
bookingName,

 bookingItems,
 extra_packages: extraPackages,
 venueParticipants: Number(venueParticipants) || 0,

check_in:start,
check_out:end,

total_price,

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

if(notifications.length)
await Notification.insertMany(notifications);

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

const bookings = await bookingModel
.find({ user_id: req.userId })
.populate("bookingItems.room_id")
.populate("bookingItems.package_id")
.sort({ createdAt: -1 });

res.json({success:true,bookings});

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

if(booking.user_id.toString()!==req.userId)
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

const booking = await bookingModel.findByIdAndUpdate(
bookingId,
{
paymentMethod:"cash",
paymentStatus:"pending"
},
{new:true}
);

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

const booking = await bookingModel.findByIdAndUpdate(
bookingId,
{
payment:true,
paymentStatus:"paid",
paymentMethod:"gcash"
},
{new:true}
);

res.json({success:true,message:"Payment verified",booking});

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

const booking = await bookingModel.findByIdAndUpdate(
bookingId,
{rating,review},
{new:true}
);

res.json({success:true,booking});

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

const booking = await bookingModel.findById(bookingId);

if(!booking)
return res.json({success:false,message:"Booking not found"});

const chat = {
senderRole:"admin",
senderName:"Admin",
message,
createdAt:new Date()
};

booking.reviewChat.push(chat);

await booking.save();

res.json({
success:true,
message:"Reply sent",
reviewChat:booking.reviewChat
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
    "bookingItems.room_id": { $in: uniqueRooms },
    status: { $in: ["pending", "approved"] }
  },
  "check_in check_out bookingItems"
);

const conflict = bookings.some((booking) => {
  const existingStart = normalizeDate(booking.check_in);
  const existingEnd = normalizeDate(booking.check_out);
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
"bookingItems.room_id":{$in:roomIds},
status: { $in: ["pending", "approved"] }
});

const blockedDates=[];

bookings.forEach(b=>{

let current=new Date(b.check_in);

const checkoutWithCleaning = new Date(b.check_out);
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
      "bookingItems.room_id": { $in: roomIds },
      status: { $in: ["pending", "approved"] }
    },
    "check_in check_out bookingItems"
  );

  const bookedSet = new Set();
  const bookedReasons = new Map();
  bookings.forEach((booking) => {
    const existingStart = normalizeDate(booking.check_in);
    const existingEnd = normalizeDate(booking.check_out);
    const cleaningEnd = normalizeDate(addDays(existingEnd, 1));

    const isBookingOverlap = rangesOverlap(existingStart, existingEnd, start, end);
    const isCleaningOverlap = rangesOverlap(cleaningEnd, cleaningEnd, start, end);
    if (!isBookingOverlap && !isCleaningOverlap) return;

    (booking.bookingItems || []).forEach((item) => {
      const id = String(item.room_id);
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
    "check_in check_out bookingItems venueParticipants status paymentStatus"
  );

  const availability = bookings.map((b) => {
    const roomGuests = (b.bookingItems || []).reduce(
      (sum, item) => sum + Number(item.participants || 0),
      0
    );
    const venueGuests = Number(b.venueParticipants || 0);
    return {
      check_in: b.check_in,
      check_out: b.check_out,
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

const checkin = normalizeDate(b.check_in);
const checkout = normalizeDate(b.check_out);

const cleaningDay = new Date(checkout);
cleaningDay.setDate(cleaningDay.getDate() + 1);

/* OCCUPIED */
if(today >= checkin && today < checkout){

b.bookingItems.forEach(item=>{
occupiedRoomIds.push(item.room_id);
});

}

/* CLEANING DAY */
if(today.getTime() === cleaningDay.getTime()){

b.bookingItems.forEach(item=>{
cleaningRoomIds.push(item.room_id);
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
 user_id:req.userId,
 status:{$in:["pending","approved"]}
 });

const userBusyDates=[];

 bookings.forEach(b=>{

 const start = normalizeDate(b.check_in);
 const end = normalizeDate(b.check_out);

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
