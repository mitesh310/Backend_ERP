const db = require('../../config/db')

const createworkingHours = async (req, res) => {
    const query = `
  INSERT INTO timing(
      workingHours
  )
  VALUES
  ('${req.body.workingHours}')
  `
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            res.status(200).json({ status: 200, message: 'workingHours created successfully', data: results });
        }
    })
}

const getworkingHours = async (req, res) => {
    db.query(`SELECT * FROM timing WHERE 1`, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            res.status(200).json({ status: 200, message: 'got workingHours', data: results });
        }
    })
}
const getworkingHoursbyId = async (req, res) => {
    if (isNaN(req.params.id)) {
        res.status(400).json({ message: " id is required" });
        return;
      }
      db.query(`SELECT * FROM timing WHERE 	timingId=${req.params.id}`, (err, results) => {
        if (err) {
          res.status(500).json({ error: 'Internal server error', message: err });
          return;
        } else {
            if (results.length==0) {
                return res.json({ status: 200, message: "no working hours found for given id" });
                   
            }
         return res.json({ status: 200, message: "got timings successfully", data: results });
        }
      });
}


const updateWorkingHours = async (req, res) => {
    console.log(req.body);

    db.query(`UPDATE timing SET workingHours=${req.body.workingHours} WHERE timingId = ${req.body.timingId } `, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            res.status(200).json({ status: 200, message: 'workingHours updated sucessfully', data: results });
        }
    })
}

const deleteWorkingHours = async (req, res) => {
    db.query(`DELETE FROM timing WHERE timingId=${req.params.id} `, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            res.status(200).json({ status: 200, message: 'timing deleted scucessfully', data: results });
        }
    })
}

module.exports={createworkingHours,getworkingHours,updateWorkingHours,getworkingHoursbyId,deleteWorkingHours}