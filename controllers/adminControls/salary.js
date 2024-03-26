// Inside your Node.js server file (e.g., app.js or server.js)
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const multer = require('multer');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));


const db = require('../../config/db')

const { totalDaysInMonth, countSundays } = require('../../utils/getdateofmonths')
const { timeDiff } = require('../../utils/timeDiff')

const convtoIST = require('../../utils/convtoIST');

const { getDaysOfMonthWithDay } = require('../../utils/getdateofmonths');


// Example usage
// let year = 2024;
// let month = 2; // 0-based index, so 2 represents March
// let daysInMonth = getDaysInMonth(year, month);
// console.log(daysInMonth); // Output: 31


const createSalarybyempId = async (req, res) => {




    // required body: employeeId, month, year, workinghours

    // ex: need to calculate salary of 1st month of employee no 102
    // pay per hour(PPH)= salary/ (total days of month - weekends- holidays)* working hours
    //net salary= salary - PPH * ([total leaves -1 + absent days]*8) 



    // 2 for march, 3 for april and so on...
    const noofDays = totalDaysInMonth(2024, `${req.body.month}`)
    console.log("no of days------>", noofDays)
    const noofSundays = countSundays(2024, `${req.body.month}`)
    console.log("no of sundays------>", noofSundays)

    //get working hour of the compnay
    const workinghours = await new Promise((resolve, reject) => {
        const query = `SELECT *
        FROM timing
        WHERE 1 `

        db.query(query, (err, results) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(results[0].workingHours);
            }
        })
    })


    //getting all the holidays offered in the months(including alternate saturday announced by admin too)
    const holidaysofMonth = await new Promise((resolve, reject) => {

        const startDate = new Date(req.body.year, req.body.month - 1, 2); // Months are 0-indexed in JavaScript Date
        const endDate = new Date(req.body.year, req.body.month, 0); // Day 0 of the next month is the last day of the current month

        // Convert startDate and endDate to MySQL date format 'YYYY-MM-DD'
        const startDateFormat = startDate.toISOString().split('T')[0];
        console.log("startdate of month", startDateFormat)
        const endDateFormat = endDate.toISOString().split('T')[0];
        console.log("startdate of month", endDateFormat)


        const query = `SELECT holidayDate
        FROM holidays
        WHERE holidayDate >= "${startDateFormat}"
        AND holidayDate <= "${endDateFormat}" `

        db.query(query, (err, results) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(results);
            }
        })
    })
    holidaysofMonth.forEach((day) => {
        day.holidayDate = convtoIST(day.holidayDate);
    });
    const noofHolidays = holidaysofMonth.length;
    console.log("no of holidays------>", noofHolidays)


    // const leavesOfEmployee = await new Promise((resolve, reject) => {
    //     const query = `SELECT 	startDate
    //     FROM leaves
    //     WHERE startDate >= DATE_FORMAT(NOW(), '%Y-%m-01')
    //     AND startDate <= LAST_DAY(NOW()) 
    //     AND empId= ${req.body.emplyoeeId}
    //     `

    //     db.query(query, (err, results) => {
    //         if (err) {
    //             reject(err)
    //         }
    //         else {
    //             resolve(results);
    //         }
    //     })
    //     leavesOfEmployee.forEach((day) => {
    //         day.startDate = convtoIST(day.startDate);
    //     });
    // })


    const currentSalary = await new Promise((resolve, reject) => {
        const query = `SELECT 	salary
        FROM employee
        WHERE employeeId= ${req.body.employeeId}; `

        db.query(query, (err, results) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(results[0].salary);
            }
        })
    })
    console.log("salary of employee------>", currentSalary)

    //finding present days of employee 
    const getPresentDays = async (req, res) => {
        const startDate = new Date(req.body.year, req.body.month - 1, 2); // Months are 0-indexed in JavaScript Date
        const endDate = new Date(req.body.year, req.body.month, 0); // Day 0 of the next month is the last day of the current month

        // Convert startDate and endDate to MySQL date format 'YYYY-MM-DD'
        const startDateFormat = startDate.toISOString().split('T')[0];
        const endDateFormat = endDate.toISOString().split('T')[0];

        const resData = getDaysOfMonthWithDay();
        // console.log(resData)
        const attendenceData = await new Promise((resolve, reject) => {
            const query = `SELECT *
        FROM attendence
        WHERE Date >=  "${startDateFormat}"
        AND Date <=  "${endDateFormat}"
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


        const HolidayDates = await new Promise((resolve, reject) => {
            const startDate = new Date(req.body.year, req.body.month - 1, 2); // Months are 0-indexed in JavaScript Date
            const endDate = new Date(req.body.year, req.body.month, 0); // Day 0 of the next month is the last day of the current month

            // Convert startDate and endDate to MySQL date format 'YYYY-MM-DD'
            const startDateFormat = startDate.toISOString().split('T')[0];
            const endDateFormat = endDate.toISOString().split('T')[0];
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
            const startDate = new Date(req.body.year, req.body.month - 1, 2); // Months are 0-indexed in JavaScript Date
            const endDate = new Date(req.body.year, req.body.month, 0); // Day 0 of the next month is the last day of the current month

            // Convert startDate and endDate to MySQL date format 'YYYY-MM-DD'
            const startDateFormat = startDate.toISOString().split('T')[0];
            const endDateFormat = endDate.toISOString().split('T')[0];

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
        console.log("no. of leaves-------->", leaveDates.length)

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


                if (day.date == attendenceDateAsString) {
                    day.attendenceStatus = "present";
                    day.attendeDetails = attendenceofDay;
                }
            }
        }
        return [resData, leaveDates]

    }

    const [totalPresentDays, leaveDates] = await getPresentDays(req, res)
    // console.log(" employee was present on days ------>", totalPresentDays.length)


    let hoursworked = 0;
    for (let i = 0; i < totalPresentDays.length; i++) {
        const day = totalPresentDays[i];

        if (!day.attendeDetails) {
            continue
        }
        else {
            // console.log("present on day",day.date)
            const time1 = day.attendeDetails.clockIn;
            const time2 = day.attendeDetails.clockOut;
            const [hours] = timeDiff(time1, time2);
            // console.log(hours + "on day", + day.date)
            hoursworked += hours;
            // console.log(hoursworked)
        }
    }
    console.log("total hour worked------->", hoursworked)


    const totalWorkingHours = (noofDays - noofHolidays - noofSundays) * workinghours;
    console.log("totalWorkingHours-------->", totalWorkingHours)
    const PayPerHour = currentSalary / totalWorkingHours;
    console.log("PayPerHour---------->", PayPerHour)


    const leavesofMonth = leaveDates.length;
    const leavesDeducation = leaveDates.length * PayPerHour * workinghours;
    const bonus = PayPerHour * workinghours;
    const netSalary = (PayPerHour * hoursworked) + (PayPerHour * workinghours);
    //appending data to the response
    resobj = {}
    resobj.currentSalary = currentSalary;
    resobj.leavesofMonth = leavesofMonth;
    resobj.leavesDeducation = leavesDeducation;
    resobj.leavesDetails = leaveDates;
    resobj.bonus = bonus;

    resobj.netSalary = netSalary;

    const values = [
        req.body.employeeId,
        req.body.status,
        req.body.month,
        req.body.year,
        currentSalary,
        leavesofMonth,
        leavesDeducation,
        bonus,
        netSalary
    ]
    const query = `
    INSERT INTO salaries(
        employeeId,
        status,
        month,
        year,
        currentSalary,
        leavesofMonth,
        leavesDeducation,
        bonus,
        netSalary
    )
    VALUES
     (?, ?, ?, ?,
      ?, ?, ?, ?,
      ? );`

    db.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Error in creating employe", error: err });
        }
        res.json({ status: 200, message: "entry successfull in salary table", data: resobj });
    })


    console.log("end of response--------------------------------------------------------------------------------------------------")
}

const getSalarybysalaryId=(req,res)=>{
    if (isNaN(req.params.id)) {
        res.status(400).json({ message: "project id is required" });
        return;
      }
      db.query(`SELECT * FROM salaries WHERE 	salaryId =${req.params.id}`, (err, results) => {
        if (err) {
          res.status(500).json({ error: 'Internal server error', message: err });
          return;
        } else {
          res.json({ status: 200, message: "got salary successfully", data: results });
        }
      });
}
const getallSalaries=(req,res)=>{
      db.query(`SELECT * FROM salaries WHERE 1`, (err, results) => {
        if (err) {
          res.status(500).json({ error: 'Internal server error', message: err });
          return;
        } else {
          res.json({ status: 200, message: "got all salaries successfully", data: results });
        }
      });
}


module.exports = { createSalarybyempId,getSalarybysalaryId,getallSalaries }