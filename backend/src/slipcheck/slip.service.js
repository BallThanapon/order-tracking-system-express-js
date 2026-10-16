const axios = require("axios");
const fs = require("fs");
const { apiError } = require("../errors");

const slipCheck = async () => {
  try {
    const branchId = "78327";
    const apiKey = "SLIPOKZHAJS1G";
    const path = "test.jpg";
    try {
      const buffer = fs.readFileSync(path);
      const res = await axios.post(
        `https://api.slipok.com/api/line/apikey/${branchId}`,
        {
          files: buffer,
          // amount: number, // Add this to check with amount of the slip
        },
        {
          headers: {
            "x-authorization": apiKey,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      // Handle success slip
      const slipData = res.data.data;
      return slipData;
    } catch (e) {
      console.log(e);
      throw apiError("IMAGE ERROR", "no such file or directory", 400);
    }
  } catch (err) {
    // Handle invalid slip
    if (axios.isAxiosError(err)) {
      const errorData = err.response.data;
      console.log(errorData.code); // Check error code
      console.log(errorData.message); // Check error message
      throw apiError("NETWORK ERROR", "cannot connect to slip API", 400);
    }
    throw err;
  }
};

module.exports = {
  slipCheck,
};
