// Inside your Node.js server file (e.g., app.js or server.js)
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const port = 8080;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));


const db = require('../../config/db')


const { todayDate } = require('../../utils/getDate')

const convtoIST = require('../../utils/convtoIST')
const createHoliday = async (req, res) => {
    const values = [
        !req.body.holidayType ? "holiday" : req.body.holidayType,
        req.body.holidayName,
        req.body.holidayDescription,
        req.body.holidayDate,
        !req.files ? "" : JSON.stringify(req.files.map(file => file.filename))
    ];

    const query = `INSERT INTO holidays ( 
        holidayType,
        holidayName,
        holidayDescription,
        holidayDate,
        holidayDocs
        ) 
        VALUES
        (?,?,?,?,
          ?)`;

    db.query(query, values, (err, result) => {
        if (err) {
            res.status(500).send({ message: "erro in inserting holidays", error: err });
            return;
        }
        res.status(200).send({ status: 200, message: 'insertion success in holidays table', document: req.body });
    });
}
const getAllHolidays = async (req, res) => {
    db.query(`SELECT * FROM holidays WHERE holidayDate> '${todayDate}'`, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            results.forEach(row => {
                row.holidayDate=convtoIST(row.holidayDate)
            });
            res.status(200).json({ status: 200, message: 'got all policies', data: results });
        }
    })
}
const getHolidaysbyId = async (req, res) => {
    db.query(`SELECT * FROM holidays WHERE holidayId=${req.params.id}`, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            results.forEach(row => {
                row.holidayDate=convtoIST(row.holidayDate)
            });
            res.status(200).json({ status: 200, message: 'data for given policy Id', data: results });
        }
    })
}
const updateHoliday = async (req, res) => {
    console.log(req.body)
    console.log(req.files)

    const query = `UPDATE \`holidays\` 
    SET 
    \`holidayType\`='${req.body.holidayType}',
    \`holidayName\`='${req.body.holidayName}',
    \`holidayDescription\`='${req.body.holidayDescription}',
    \`holidayDate\`='${req.body.holidayDate}',
    \`holidayDocs\` = '${!req.files ? "" : JSON.stringify(req.files.map(file => file.filename))}'
    
    WHERE
    \`holidayId\`=${req.body.holidayId}`;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            res.status(200).json({ status: 200, message: 'Holiday updated sucessfully', data: results });
        }
    })
}
const deleteHoliday = async (req, res) => {
    db.query(`DELETE FROM holidays WHERE holidayId=${req.params.id} `, (err, results) => {
        if (err) {
            res.status(500).json({ err: 'Internal Server Error', err: err });
            return;
        }
        else {
            res.status(200).json({ status: 200, message: 'holiday deleted scucessfully', data: results });
        }
    })
}

module.exports = { createHoliday, getAllHolidays, getHolidaysbyId, updateHoliday, deleteHoliday }