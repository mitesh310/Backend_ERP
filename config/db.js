// Inside your Node.js server file (e.g., app.js or server.js)
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const port = 8080;
const cors = require('cors');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));

// sql db credentials

    const db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'erp_weblock'
    });
    
    // //sql connection goes here
    // db.connect((err) => {
    //     if (err) {
    //         console.error('MySQL connection failed: ' + err.stack);
    //         return;
    //     }
    //     console.log(`Connected to MySQL sql database erp_weblock on port ${port}`);
    // });

module.exports=db