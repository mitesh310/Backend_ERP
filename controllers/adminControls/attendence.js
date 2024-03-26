const db = require('../../config/db')


const { getDaysOfMonthWithDay } = require('../../utils/getdateofmonths');
const convtoIST = require('../../utils/convtoIST');

const presentToday = async (req, res) => {
  try {
    const employeestoday = await new Promise((resolve, reject) => {
      const query = `SELECT employeeId FROM attendence WHERE Date="${req.body.date}"`
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const employewithDetails = await Promise.all(employeestoday.map(async (row) => {
      try {
        const employee = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.employeeId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result[0]);
            }
          });
        });

        // Combine project details with the row
        return { ...row, employee };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));
    res.json({ status: 200, message: "todays present employee", data: employewithDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }

}

const getattendencebyempid = async (req, res) => {
  console.log(req.body)

  const startDate = new Date(req.body.year, req.body.month - 1, 2); // Months are 0-indexed in JavaScript Date
  const endDate = new Date(req.body.year, req.body.month, 1); // Day 0 of the next month is the last day of the current month
  const startDateFormat = startDate.toISOString().split('T')[0];
  console.log("startdate of month", startDateFormat)
  const endDateFormat = endDate.toISOString().split('T')[0];
  console.log("startdate of month", endDateFormat)

  const resData = getDaysOfMonthWithDay(req.body.year, req.body.month);
  const attendenceData = await new Promise((resolve, reject) => {
    const query = `SELECT *
    FROM attendence
    WHERE Date >="${startDateFormat}"
    AND Date <="${endDateFormat}"
    AND employeeId= ${req.body.employeeId} `
    db.query(query, (err, results) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(results);
      }
    })
  })
  attendenceData.forEach((attendence) => {
    attendence.Date = convtoIST(attendence.Date);
  });
  const breaksData = await new Promise((resolve, reject) => {
    const query = `SELECT *
    FROM breaks
    WHERE Date >= "${startDateFormat}"
    AND Date <= "${endDateFormat}"
    AND employeeId= ${req.body.employeeId} `
    db.query(query, (err, results) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(results);
      }
    })
  })
  breaksData.forEach((attendence) => {
    attendence.Date = convtoIST(attendence.Date);
  });


  const HolidayDates = await new Promise((resolve, reject) => {
    const query = `SELECT *
    FROM holidays
    WHERE holidayDate >= "${startDateFormat}"
    AND holidayDate <= "${endDateFormat}"
    `

    db.query(query, (err, results) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(results);
      }
    })
  })
  HolidayDates.forEach((holiday) => {
    holiday.holidayDate = convtoIST(holiday.holidayDate);
  });
  
  
  const leaveDates = await new Promise((resolve, reject) => {
    const query = `SELECT *
    FROM leaves
    WHERE startDate >= "${startDateFormat}"
    AND startDate <= "${endDateFormat}"
    AND status="approve"
    AND empId=${req.body.employeeId}
    `
    
    db.query(query, (err, results) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(results);
      }
    })
  })
  
  leaveDates.forEach((leave) => {
    leave.startDate = convtoIST(leave.startDate);
    leave.endDate = convtoIST(leave.endDate);
  });
  
  for (let i = 0; i < resData.length; i++) {
    const day = resData[i];
    day.attendenceStatus = "absent"

    //checking sunday
    if (day.dayName === "Sunday") {
      day.attendenceStatus = "Weekend"
    }

    //checking if holiday
    for (let j = 0; j < HolidayDates.length; j++) {
      const holiday = HolidayDates[j];
      const holidayDateAsString = holiday.holidayDate.toISOString().split('T')[0];
      if (day.date == holidayDateAsString && holiday.holidayType == "holiday") {
        day.attendenceStatus = "Holiday";
        day.holidayDetails = holiday;
      }
      if (day.date == holidayDateAsString && holiday.holidayType == "weekend") {
        day.attendenceStatus = "Weekend";

      }
    }

    //checking if on leave
    for (let j = 0; j < leaveDates.length; j++) {
      const leave = leaveDates[j];
      const leavestartDateAsString = leave.startDate.toISOString().split('T')[0];
      const leavesendDateAsString = leave.endDate.toISOString().split('T')[0];
      if (day.date <= leavesendDateAsString && day.date >= leavestartDateAsString) {
        day.attendenceStatus = "Leave"
        day.leaveDetails = leave
      }
    }

    //if none of above changing status to "present" else remains absent
    for (let j = 0; j < attendenceData.length; j++) {
      const attendenceofDay = attendenceData[j];
      const attendenceDateAsString = attendenceofDay.Date.toISOString().split('T')[0]; // Convert Date object to string in "YYYY-MM-DD" format

      const todayBreaks = await new Promise((resolve, rejects) => {
        db.query(`SELECT breakStart ,breakEnd FROM breaks WHERE employeeId=${req.body.employeeId} AND Date= "${attendenceDateAsString}"`, (err, results) => {
          if (err) {
            rejects(err)
          }
          else {
            resolve(results)
          }
        })
      })
      if (day.date == attendenceDateAsString) {
        day.attendenceStatus = "present"
        day.attendeDetails = attendenceofDay
        day.breakDetails = todayBreaks
      }
    }

  }


  res.status(200).json({ status: 200, message: 'got data', data: resData });

}

module.exports = { presentToday, getattendencebyempid }