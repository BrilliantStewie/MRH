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
check_out
} = req.body;

if(!bookingItems.length)
return res.json({success:false,message:"No rooms selected"});

/* ---------- NORMALIZE DATES ---------- */

const start=normalizeDate(check_in);
const end=normalizeDate(check_out);
const today=normalizeDate(new Date());

if(start < today)
return res.json({success:false,message:"Past dates not allowed"});

if(end <= start)
return res.json({success:false,message:"Invalid date range"});

/* ---------- GET ROOM IDS ---------- */

const roomIds = bookingItems.map(item=>item.room_id);
const uniqueRooms=[...new Set(roomIds)];

/* ---------- CHECK DOUBLE BOOKING ---------- */

const conflict = await bookingModel.findOne({
"bookingItems.room_id":{$in:uniqueRooms},
status:"approved",
check_in:{$lt:end},
check_out:{$gt:start}
});

if(conflict)
return res.json({
success:false,
message:"Rooms already booked for selected dates"
});

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

/* ---------- CREATE BOOKING ---------- */

const booking = await bookingModel.create({

user_id:userId,
bookingName,

bookingItems,

check_in:start,
check_out:end,

total_price,

status:"pending",
payment:false,
paymentStatus:"unpaid",
paymentMethod:"n/a"

});

/* ---------- NOTIFY ADMINS ---------- */

const admins = await bookingModel.db.model("User").find({role:"admin"});

const notifications = admins.map(admin=>({
recipient:admin._id,
sender:userId,
type:"booking_update",
message:`New booking request: ${bookingName}`,
link:"/admin/bookings",
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

const start=normalizeDate(checkIn);
const end=normalizeDate(checkOut);

const conflict = await bookingModel.findOne({
"bookingItems.room_id":{$in:roomIds},
status:"approved",
check_in:{$lt:end},
check_out:{$gt:start}
});

if(conflict)
return res.json({success:false,message:"Rooms unavailable"});

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
status:"approved"
});

const blockedDates=[];

bookings.forEach(b=>{

let current=new Date(b.check_in);

while(current<b.check_out){

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
   GET OCCUPIED ROOMS
====================================================== */

export const getOccupiedRooms = async (req,res)=>{
try{

const today=normalizeDate(new Date());

const bookings = await bookingModel.find({
status:"approved",
check_in:{$lte:today},
check_out:{$gt:today}
});

const occupiedRoomIds = bookings.flatMap(b =>
b.bookingItems.map(item=>item.room_id)
);

res.json({success:true,occupiedRoomIds});

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

let current=new Date(b.check_in);

while(current<b.check_out){

userBusyDates.push(new Date(current));

current.setDate(current.getDate()+1);

}

});

res.json({success:true,userBusyDates});

}catch(error){
res.json({success:false,message:error.message});
}
};