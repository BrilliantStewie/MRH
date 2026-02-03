// src/assets/assets.js

import add_icon from "./add_icon.svg";
import logo from "./logo.svg"; // <--- Updated to match your folder
import appointment_icon from "./appointment_icon.svg";
import appointments_icon from "./appointments_icon.svg";
import cancel_icon from "./cancel_icon.svg";
import doctor_icon from "./doctor_icon.svg";
import earning_icon from "./earning_icon.svg";
import home_icon from "./home_icon.svg";
import list_icon from "./list_icon.svg";
import patient_icon from "./patient_icon.svg";
import patients_icon from "./patients_icon.svg";
import people_icon from "./people_icon.svg";
import tick_icon from "./tick_icon.svg";
import upload_area from "./upload_area.svg";

// If you later add more icons just import them here and add them to the object.
export const assets = {
  add_icon,
  logo, // <--- Now available to use as assets.logo
  appointment_icon,
  appointments_icon,
  cancel_icon,
  doctor_icon,
  earning_icon,
  home_icon,
  list_icon,
  patient_icon,
  patients_icon,
  people_icon,
  tick_icon,
  upload_area,
};

// Default export so `import assets from "../../assets/assets"` also works
export default assets;