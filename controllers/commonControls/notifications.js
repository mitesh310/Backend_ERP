const db = require('../../config/db');

const createNotification = async (req, res) => {
    const query = `INSERT INTO notifications
    (   notificationFrom,
       fromId,
        notificationTo,
        toId,
        hasRead,
        notificationType,
        notificationTitle,
        notificationBody)
         VALUES 
         (?,?,?,?,
          ?,?,?,?)`;

    const values = [
        req.body.notificationFrom,
        req.body.fromId,
        req.body.notificationTo,
        req.body.toId,
        0,
        req.body.notificationType,
        req.body.notificationTitle,
        req.body.notificationBody
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            res.status(500).send({ message: "erro in inserting notifications", error: err });
            return;
        }
        return res.status(200).send({ status: 200, message: 'insertion success in notification table', document: req.body });
    });
}
const getNotificationbyemployeeId = async (req, res) => {

    const notifications = await new Promise((resolve, reject) => {
        db.query(`SELECT * FROM notifications WHERE toId=${req.params.id} ORDER BY 'notificationsId' DESC`, (err, result) => {
            if (err) {
                reject(err)
            }
            resolve(result)
        });
    })
    const notificationsData = await Promise.all(notifications.map(async (row) => {
        try {

            //getting to details
            const toDetails = await new Promise((resolve, reject) => {
                const lookup = `${row.notificationTo}` + `Id`;
                const query = `SELECT * from ${row.notificationTo} WHERE ${lookup} = ${row.toId} ORDER BY 'notificationsId' DESC`;
                db.query(query, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result[0]);
                    }
                });
            })
            
            //getting from details
            const fromDetails = await new Promise((resolve, reject) => {
                const lookup = `${row.notificationFrom}` + `Id`;
                db.query(`SELECT * from ${row.notificationFrom} WHERE  ${lookup} = ${row.fromId}`, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result[0]);
                    }
                });
            })

            return { ...row, toDetails, fromDetails }
        } catch (error) {
            console.log("Error fetching project details:", error);
            return row;
        }
    }))
    const numberOfnotifications=notificationsData.length;
    return res.status(200).send({ status: 200, message: 'got notification notification table',  data: {numberOfnotifications,notificationsData} });
}

const seeNotificationbyId = (req,res)=>{
    const query= `UPDATE notifications SET hasRead=1 WHERE notificationsId=${req.params.id}`

    db.query(query,(err,result)=>{
        if (err) {
            return  res.status(500).json({ error: 'Internal server error', message: err });
        }
        return  res.status(200).send({ status: 200, message: 'message seen',data:result});
    })
}

module.exports = { createNotification, getNotificationbyemployeeId,seeNotificationbyId }