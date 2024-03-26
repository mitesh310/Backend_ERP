function getDaysOfMonthWithDay(year,month) {
  
    const daysInMonth = new Date(year, month , 0).getDate(); // Get total days in the month
  
    const daysArray = [];
  
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month-1, i);
      const formattedDate = formatDate(day);
      daysArray.push({
        date: formattedDate,
        dayName: getDayName(day.getDay())
      });
    }
  
    return daysArray;
  }
  
  function getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }
  
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function totalDaysInMonth(year, month) {
    // JavaScript months are zero-based (0 = January, 1 = February, etc.)
    // So, to get the last day of a month, set the day to 0 of the next month
    return new Date(year, month , 0).getDate();
}

function countSundays(year, month) {
  let sundayCount = 0;
  // Month in JavaScript is 0-indexed (January is 0, February is 1, etc.), so adjust by -1.
  let date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 0) { // Sunday
      sundayCount++;
    }
    date.setDate(date.getDate() + 1); // Move to the next day
  }
  return sundayCount;
}

  
  module.exports= {getDaysOfMonthWithDay,totalDaysInMonth,countSundays}