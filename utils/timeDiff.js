const timeDiff = (time1, time2) => {
    // Given timestamps
    // const clockInTimestamp = "11:18:41";
    // const clockOutTimestamp = "16:07:15";

    // Function to parse time string into Date object
    function parseTime(timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':');
        return new Date(0, 0, 0, hours, minutes, seconds);
    }

    // Parse clock in and clock out timestamps
    const clockIn = parseTime(time1);
    const clockOut = parseTime(time2);

    // Calculate time difference in milliseconds
    const timeDifferenceMs = clockOut.getTime() - clockIn.getTime();

    // Calculate hours, minutes, and seconds from the time difference
    const hours = Math.floor(timeDifferenceMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifferenceMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifferenceMs % (1000 * 60)) / 1000);

    // Output the time difference
    // console.log("Time difference:", hours, "hours,", minutes, "minutes,", seconds, "seconds");
    
    return [ minutes> 45 ? hours + 1 : hours, minutes, seconds]

}
module.exports = { timeDiff }