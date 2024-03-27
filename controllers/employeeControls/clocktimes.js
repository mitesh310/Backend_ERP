const db = require('../../config/db')

const {getDate} = require('../../utils/getDate.js') 

const clockIn=async (req, res) => {
    var today = new Date();
    const { currentTime, todayDate } = getDate(today)
  
    const isClockedin = await new Promise((resolve, reject) => {
      db.query(`SELECT * FROM attendence WHERE employeeId=${req.body.employeeId} AND Date="${todayDate}" `, (err, results) => {
        if (results) {
          resolve(results)
        }
        else reject(err)
      })
    })
    if (isClockedin.length !== 0) {
      return res.status(500).json({ status: 500, error: 'employee has already clock in, only clock out is allowed', employeeDetails: isClockedin });
    }
    const values = [
      req.body.employeeId,
      todayDate,
      currentTime,
    ];
    const query = `INSERT INTO attendence
    (
      employeeId,
      Date,
      clockIn
    ) VALUES
    (
      ?,?,?
    )`
  
    db.query(query, values, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'clock in error' });
      }
      return res.status(200).json({ status: 200, message: 'employee clocked in', employeeDetails: results, employeeId: req.body.employeeId });
    })
  }

const clockOut = (req, res) => {
    const today = new Date();
    const { currentTime, todayDate } = getDate(today)
    db.query(`SELECT * from attendence WHERE employeeId=${req.body.employeeId} AND 	clockOut="00:00:00"`, (err, results) => {
        if (err) {
            return res.status(400).json({ message: 'error in doing clockout', err });
        }
        else {
            if (results.length == 0) {
                return res.status(400).json({ message: 'employee has not clocked in' });
            }

            const query = `UPDATE attendence 
                   SET clockOut = '${currentTime}' 
                   WHERE employeeId = ${req.body.employeeId}
                   AND Date= "${todayDate}"`;
            db.query(query, (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'clock-out in error', err });
                }
                res.status(200).json({ status: 200, message: 'employee clocked-out' });
            })
        }
    })

}

const clockinstatus=(req, res) => {
    const today = new Date();
    const { todayDate } = getDate(today)
  
    db.query(`SELECT * from attendence WHERE employeeId=${req.body.employeeId} AND 	Date="${todayDate}"`, (err, results) => {
      if (results.length == 0) {
        return res.status(400).json({ status: 400, message: 'employee has not clocked in' });
      }
      res.status(200).json({ status: 200, message: 'employee has clocked in' });
    })
  }

module.exports={clockOut,clockIn,clockinstatus}