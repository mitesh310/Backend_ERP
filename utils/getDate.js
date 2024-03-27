const getDate=(today)=>{

    // Create a new Date object which will represent today's date
    // var today = new Date();
    
    // Extract the year, month, and day components from the Date object
    var year = today.getFullYear();
    var month = today.getMonth() + 1; // Note: January is 0, so we add 1 to get the correct month
    var day = today.getDate();
    
    // Extract hours, minutes, and seconds from the Date object
    var hours = today.getHours();
    var minutes = today.getMinutes();
    var seconds = today.getSeconds();
    
    // Format the date as YYYY-MM-DD and time as HH:MM:SS
    var todayDate = year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
    var currentTime = (hours < 10 ? '0' + hours : hours) + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
    return {todayDate,currentTime}
}
module.exports={getDate};