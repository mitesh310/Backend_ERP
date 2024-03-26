
const convtoIST=(time)=>{
    // Assuming your UTC date is in ISO 8601 format
    const utcDate = new Date(time);

    // Convert UTC to IST
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate;
  }
  module.exports= convtoIST