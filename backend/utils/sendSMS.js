import axios from "axios";

const sendSMS = async (to, message) => {
  try {
    const response = await axios.post(
      "https://api.semaphore.co/api/v4/messages",
      {
        apikey: process.env.SEMAPHORE_API_KEY,
        number: to,
        message: message,
        sendername: "MRH"
      }
    );

    console.log("SMS sent:", response.data);
    return { success: true };

  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    return { success: false, message: error.message };
  }
};

export default sendSMS;