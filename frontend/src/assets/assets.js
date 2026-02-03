// src/assets/assets.js

// =====================================================
// 1. SHARED UI IMAGES  (KEEP – already in the template)
// =====================================================
import appointment_img from './appointment_img.png';   // KEEP
import header_img from './header_img.png';             // KEEP
import group_profiles from './group_profiles.png';     // KEEP
import profile_pic from './profile_pic.png';           // KEEP
import contact_image from './contact_image.png';       // KEEP
import about_image from './about_image.png';           // KEEP
import logo from './logo.svg';                         // KEEP
import dropdown_icon from './dropdown_icon.svg';       // KEEP
import menu_icon from './menu_icon.svg';               // KEEP
import cross_icon from './cross_icon.png';             // KEEP
import chats_icon from './chats_icon.svg';             // KEEP
import verified_icon from './verified_icon.svg';       // KEEP
import arrow_icon from './arrow_icon.svg';             // KEEP
import info_icon from './info_icon.svg';               // KEEP
import upload_icon from './upload_icon.png';           // KEEP
import stripe_logo from './stripe_logo.png';           // KEEP (if you still show Stripe)
import razorpay_logo from './razorpay_logo.png';       // KEEP (or remove if not needed)

// =====================================================
// 2. ROOM-TYPE ICONS (YOU MUST ADD THESE FILES)
// =====================================================
import singleRoom from './singleRoom.svg';             // ADD this file
import singleRoomPullout from './singleRoomPullout.svg';             // ADD this file
import dormRoom from './dormRoom.svg';                 // ADD this file
// import conferenceRoom from './conferenceRoom.svg';   // NOT USED right now

// =====================================================
// 3. EXPORT OBJECT USED AROUND THE APP
// =====================================================
export const assets = {
  appointment_img,
  header_img,
  group_profiles,
  logo,
  chats_icon,
  verified_icon,
  info_icon,
  profile_pic,
  arrow_icon,
  contact_image,
  about_image,
  menu_icon,
  cross_icon,
  dropdown_icon,
  upload_icon,
  stripe_logo,
  razorpay_logo,
};

// =====================================================
// 4. ROOM TYPE DATA FOR <RoomTypeMenu />
// =====================================================
export const roomTypeData = [
  {
    roomtype: 'Single Room',
    image: singleRoom,
  },
  {
    roomtype: 'Single Room (Pull Out)',
    image: singleRoomPullout,
  },
  {
    roomtype: 'Dormitory',
    image: dormRoom,
  },
];
