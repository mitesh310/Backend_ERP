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

const db = require('./config/db.js')

db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed: ' + err.stack);
    return;
  }
  console.log(`Connected to MySQL sql database erp_weblock on port ${port}`);
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const checkRequiredFields = require('./utils/validator.js')
const convtoIST = require('./utils/convtoIST.js')
const {getDate} = require('./utils/getDate.js')
const queryPromise = require('./utils/queryPromise.js');
//------------------------ your API goes here--------------------------

// 1. admin login 
app.post('/adminlogin', checkRequiredFields([
  "email",
  "password"
]), (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM admin WHERE email = ? AND password = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (results && results.length > 0) {
      res.status(200).json({ status: 200, message: 'Login successful', data: results[0]?.id });
      return
    } else {
      res.status(401).json({ error: 'Unauthorized admin access' });
    }
  });
});


//employee APIs
// 2. create employee data

//2.1 making file upload functionality for the salaryslip,experienceletter and profilepic
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./public/images")
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}_${file.originalname}`)
  }
})
const upload = multer({ storage })

const employee_pics = upload.fields([{ name: 'salarySlip', maxCount: 1 }, { name: 'experienceLetter', maxCount: 1 }, { name: 'profilePic', maxCount: 1 }])

//2.2 query for inserting into the db
app.post('/createemployee', employee_pics, checkRequiredFields([
  "name",
  "email",
  "companyEmail",
  "password",
  "gender",
  "marital_status",
  "mobileNumber",
  "altmobileNumber",
  "address",
  "date_of_birth",
  "date_of_joining",
  "designation",
  "ExperienceType",
  "salary",
]), async (req, res) => {
  if (!req.files.profilePic) {
    res.status(400).send({ status: 200, message: 'provide profile pic' });
    return
  }
  const values = [
    req.body.name,
    req.body.email,
    req.body.companyEmail,
    req.body.password,
    req.body.gender,
    req.body.marital_status,
    req.body.mobileNumber,
    req.body.altmobileNumber,
    req.body.address,
    req.body.date_of_birth,
    req.body.date_of_joining,
    req.body.designation,
    req.body.ExperienceType,
    !req.files.salarySlip ? "" : req.files.salarySlip[0].filename,
    !req.files.experienceLetter ? "" : req.files.experienceLetter[0].filename,
    req.files.profilePic[0].filename,
    req.body.salary
  ];

  //query of employee db entry of 16 fields and two default
  const query = `INSERT INTO employee ( 
    name,
    email,
    companyEmail,
    password,
    gender,
    marital_status,
    mobileNumber,
    altmobileNumber,
    address,
    date_of_birth,
    date_of_joining,
    designation,
    ExperienceType,
    salarySlip,
    experienceLetter,
    profilePic,
    salary) 
    VALUES
     (?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ? )`;

  const createemployee = await new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err)

        return;
      }
      else {
        resolve(result)
      }
    })
  });
  const lastId = await new Promise((resolve, reject) => {
    db.query('SELECT LAST_INSERT_ID();', (err, result) => {
      if (err) {
        reject(err)
        return res.status(500).json({ message: "Error in creating employe", error: err });
      }
      else {
        resolve(result[0])
      }
    })
  })
  console.log(lastId)
  createemployee.newemployeeId = lastId;
  res.status(200).send({ status: 200, message: 'employee created successfully', data: createemployee });
});

//edit employee details

app.post('/editemployee', employee_pics, checkRequiredFields(["employeeId"]), (req, res) => {
  console.log(req.body);
  console.log("file is here--->", req.files);

  let query = 'UPDATE employee SET ';
  let values = [];

  const fieldsToUpdate = [
    'name', 'email', 'companyEmail', 'password', 'gender', 'marital_status',
    'mobileNumber', 'altmobileNumber', 'address', 'date_of_birth', 'date_of_joining',
    'designation', 'ExperienceType', 'salary'
  ];

  // Append file fields if present in req.files
  if (req.files.salarySlip) {
    query += `salarySlip = ?, `;
    values.push(req.files.salarySlip[0].filename);
  }

  if (req.files.experienceLetter) {
    query += `experienceLetter = ?, `;
    values.push(req.files.experienceLetter[0].filename);
  }

  if (req.files.profilePic) {
    query += `profilePic = ?, `;
    values.push(req.files.profilePic[0].filename);
  }

  // Append other fields present in req.body
  fieldsToUpdate.forEach(field => {
    if (req.body[field] !== undefined) {
      query += `${field} = ?, `;
      values.push(req.body[field]);
    }
  });

  // Remove the trailing comma and space from the query
  query = query.slice(0, -2);
  console.log(query)

  query += ' WHERE employeeId = ?';
  values.push(req.body.employeeId);

  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Error in updating employee data:", err);
      return res.status(500).json({ message: "Error in updating employee data", error: err });
    } else {
      return res.status(200).json({ message: "Employee details updated successfully", data: results });
    }
  });
});



// 3. add education details of employee

//taking its documents from frontend post req. 
//2.1 making file upload functionality for the degreeCertificate
const employee_educationD = upload.fields([{ name: 'degreeCertificate', maxCount: 1 }])

app.post('/addeducation', employee_educationD, checkRequiredFields([
  "employeeId",
  "degreeName",
  "passingYear",
  "percentage",
]), (req, res) => {
  const values = [
    req.body.employeeId,
    req.body.degreeName,
    req.body.passingYear,
    req.body.percentage,
    req.files.degreeCertificate[0].filename,
  ];
  //query of employee db entry of 16 fields and two default
  const query = `INSERT INTO employee_education ( 
    employeeId,
    degreeName,
    passingYear,
    percentage,
    degreeCertificate
    ) 
    VALUES
     (?, ?, ?, ?,?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      res.status(500).send({ message: "erro in inserting education docs", error: err });
      return;
    }
    console.log('Data inserted into employee_education:', result);
    res.status(200).send({ status: 200, message: 'Data inserted into employee_education' });
  });
});

//edit education of employee
app.post('/editeducation', employee_educationD, (req, res) => {
  console.log(req.body)
  const query = `UPDATE employee_education 
  SET 
  degreeName = '${req.body?.degreeName}',
  passingYear = '${req.body?.passingYear}',
  percentage = ${req.body?.percentage},
  degreeCertificate = '${req.files ? req.files.degreeCertificate[0].filename : ""}'
  WHERE
  employeeId = ${req.body.employeeId}`;



  db.query(query, (err, results) => {
    if (err) {
      res.json({ status: 500, message: "Error in updating tasks ", err });
      return;
    } else {
      res.json({ status: 200, message: "employee education updated successfully", data: results });
    }
  });
});

// 4. add legal documents of employee (aadhar and others)

//taking its documents from frontend post req. 
//2.1 making file upload functionality for the employee documents
const employee_legalD = upload.fields([
  { name: 'passbook', maxCount: 1 },
  { name: 'aadharcard', maxCount: 1 },
  { name: 'pancard', maxCount: 1 },
  { name: 'voterId', maxCount: 1 },
  { name: 'drivingLiscence', maxCount: 1 }
])

app.post('/adddocumets', employee_legalD, checkRequiredFields([
  "employeeId",
]), (req, res) => {
  if (!req.files.passbook) {
    res.status(400).send({ status: 400, message: 'provide  passbook' });
    return
  }
  else if (!req.files.aadharcard) {
    res.status(400).send({ status: 400, message: 'provide  aadharcard' });
    return;
  }
  else if (!req.files.pancard) {
    res.status(400).send({ status: 400, message: 'provide  pancard' });
    return;
  }

  const values = [
    req.body.employeeId,
    req.files.passbook[0].filename,
    req.files.aadharcard[0].filename,
    req.files.pancard[0].filename,
    !req.files.voterId ? "" : req.files.voterId[0].filename,
    !req.files.drivingLiscence ? "" : req.files.drivingLiscence[0].filename,
  ];

  //query of employee db entry of 16 fields and two default
  const query = `INSERT INTO employee_document ( 
    employeeId,
    passbook,
    aadharcard,
    pancard,
    voterId,
    drivingLiscence
    ) 
    VALUES
     (?, ?, ?, ?,?,?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into employee_document:', err);
      res.status(500).send({ message: "erro in inserting education docs", error: err });
      return;
    }
    res.status(200).send({ status: 200, message: 'insertion sucess in employee_document' });
  });
});

//edit documents of employee
app.post('/editdocuments', employee_legalD, (req, res) => {
  console.log(req.body)
  const query = `UPDATE employee_document 
  SET 
  passbook = '${req.files ? req.files?.passbook[0].filename : ""}',
  aadharcard = '${req.files ? req.files?.aadharcard[0].filename : ""}',
  pancard = '${req.files ? req.files?.pancard[0].filename : ""}',
  voterId = '${req.files ? req.files?.voterId[0].filename : ""}',
  drivingLiscence = '${req.files ? req.files?.drivingLiscence[0].filename : ""}'
  WHERE
  employeeId = ${req.body.employeeId}`;


  db.query(query, (err, results) => {
    if (err) {
      res.json({ status: 500, message: "Error in updating tasks ", err });
      return;
    } else {
      res.json({ status: 200, message: "employee documents updated successfully", data: results });
    }
  });
});



// 3. employee login 
app.post('/employeelogin', checkRequiredFields([
  "email",
  "password"
]), (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM employee WHERE email = ? AND password = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (results && results.length > 0) {
      res.status(200).json({ status: 200, message: 'employee Login successful', employeeId: results[0].employeeId, name: results[0].name, designation: results[0].designation });
    } else {
      res.status(401).json({ error: ' Unauthorized employee access' });
    }
  });
});

// 4. get all employees
app.get('/getusers', (req, res) => {
  db.query('SELECT * FROM employee', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    } else {
      results.forEach((employee) => {
        employee.date_of_birth = convtoIST(employee.date_of_birth);
        employee.date_of_joining = convtoIST(employee.date_of_joining);
      })
      res.json({ status: 200, message: "got employees successfully", data: results });
    }
  });

})
//get employee by id
app.get('/getemployeebyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "employee id is required" });
    return;
  }
  db.query(`SELECT * FROM employee WHERE 	employeeId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      results.forEach((employee) => {
        employee.date_of_birth = convtoIST(employee.date_of_birth);
        employee.date_of_joining = convtoIST(employee.date_of_joining);
      });

      res.json({ status: 200, message: "got employee successfully", data: results });
    }
  });

})
//get employee education by id
app.get('/getemployeeeducationbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "employee id is required" });
    return;
  }
  db.query(`SELECT * FROM employee_education WHERE 	employeeId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      res.json({ status: 200, message: "got employee successfully", data: results });
    }
  });

})
//get employee documnets by id
app.get('/getemployeedocumnetsbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "employee id is required" });
    return;
  }
  db.query(`SELECT * FROM employee_document WHERE 	employeeId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      res.json({ status: 200, message: "got employee successfully", data: results });
    }
  });

})

//delete employee

app.get('/deleteemployeebyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "employee id is required" });
    return;
  }
  db.query(`DELETE FROM employee WHERE employeeId = ${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }
    db.query(`DELETE FROM employee_document WHERE employeeId = ${req.params.id}`, (err, results) => {

      if (err) {
        res.status(500).json({ error: 'Internal server error', message: err });
        return;
      }
    })
    db.query(`DELETE FROM employee_document WHERE employeeId = ${req.params.id}`, (err, results) => {

      if (err) {
        res.status(500).json({ error: 'Internal server error', message: err });
        return;
      }
    })

    res.json({ status: 200, message: " employee deleted successfully", data: results });

  })

})

//---------------------------- projects apis starts from here-------------------------

// 5. add projects api

//taking its documents from frontend post req
//        NOTE: here seperate folder is assigned for the storage for project docs 

//api structure: this api is nested by 3 level means, another query is performed when project insertion query is performed sucessfully(from line 360).  
const project_docs_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/project_docs');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const project_docs_upload = multer({ storage: project_docs_storage })

app.post('/addproject', project_docs_upload.array('projectDocs'), checkRequiredFields([
  "ProjectName",
  "projectDescription",
  "startDate",
  "endDate",
  "participants",
  "totalTasks",
]), (req, res) => {

  const values = [
    req.body.ProjectName,
    req.body.projectDescription,
    req.body.startDate,
    req.body.endDate,
    "running",
    req.body.participants,
    req.body.totalTasks,
    !req.files ? "" : JSON.stringify(req.files.map(file => file.filename))
  ];

  const query = `INSERT INTO projects ( 
    ProjectName,
    projectDescription,
    startDate,
    endDate,
    status,
    participants,
    totalTasks,
    projectDocs
    ) 
    VALUES
    (?,?,?,?,
      ?,?,?,?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into projects:', err);
      res.status(500).send({ message: "erro in inserting projects", error: err });
      return;
    }
    //this is the query performed when project insertion qiery is done
    //this the query to get project id by special SQL query to get id of latest document inserted in the DB
    // CAUTION:  this query is returning id of the inserted document from the "WHOLE DATABASE", means if a inseriton has performed at seperate location then this will return that id, not our project id
    //            BUT since these two queries are performing within the one API call then noting to worry about much(may be)     
    db.query("SELECT LAST_INSERT_ID();", (err, result) => {
      if (err) {
        console.error('project has not inserted sucessfully', err);
        res.status(500).send({ message: "can not get id of project", error: err });
        return;
      }
      //if we get id of project sucessfully then following logic will triggered

      // s1- split incoming string of the participants (in form of 102,103,103..)  
      const arr = req.body.participants.split(",");

      // generate a pair of [employeeId, projectId] for the inserting multiple values in the employeeprojects table 
      const gen_val = () => {
        let ans = []
        for (let i = 0; i < arr.length; i++) {
          // beware: all the participants are in string formate so do we must have convert it into the int
          const element = parseInt(arr[i]);
          let pair = [element, result[0]['LAST_INSERT_ID()']];
          ans.push(pair);
        }
        return ans;
      }
      const employee_project_pairs = gen_val();

      //upon sucessfull generation of pairs run our 3rd query, i.e. insert pairs into the employeeprojects table 
      const query = `INSERT into employeeprojects (	employeeId,projectId) VALUES ?`
      db.query(query, [employee_project_pairs], (err, result) => {
        if (err) {
          console.error('can not get id of project', err);
          res.status(500).send({ message: "can not insert into the employeeprojects but projects updated sucessfully", error: err });
          return;
        }
        res.status(200).send({ status: 200, message: 'insertion sucess in projects as well as employeeprojects', data: result });
      })
    });
  });
});

//edit projects

//editable: endDate,	participants,	totalTasks,completedTasks,projectDocs
app.post('/editproject', project_docs_upload.array('projectDocs'), (req, res) => {
  const query = `UPDATE projects 
  SET 
    ProjectName='${req.body?.ProjectName}',
    projectDescription='${req.body?.projectDescription}',
    startDate = '${req.body?.startDate}',
     endDate = '${req.body?.endDate}',
     status = '${req.body?.status}',
     participants = '${req.body?.participants}',
     totalTasks = ${req.body?.totalTasks},
     projectDocs = '${JSON.stringify(req?.files.map(file => file.filename))}'
  WHERE
     projectId = ${req.body.projectId}`

  db.query(query, (err, results) => {
    if (err) {
      console.log(err)
      res.json({ status: 500, message: "Error in updating project Data ", err });
      return;
    } else {
      res.json({ status: 200, message: "project updated successfully", data: results });
    }
  });
});

//delete project

app.get('/deleteprojectbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "employee id is required" });
    return;
  }
  db.query(`DELETE FROM projects WHERE projectId  = ${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }
    db.query(`DELETE FROM employeeprojects WHERE projectId = ${req.params.id}`, (err, results) => {

      if (err) {
        res.status(500).json({ error: 'can not delete project from employeeprojects', message: err });
        return;
      }
    })
    db.query(`DELETE FROM tasks WHERE projectId = ${req.params.id}`, (err, results) => {

      if (err) {
        res.status(500).json({ error: 'can not delete project from tasks', message: err });
        return;
      }
    })

    res.json({ status: 200, message: " project deleted successfully", data: results });

  })

})

//delete project

app.get('/deletetaskbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "taskId is required" });
    return;
  }
  db.query(`DELETE FROM tasks WHERE taskId= ${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }

    res.json({ status: 200, message: " Task deleted successfully", data: results });

  })

})

// delete task by id
app.get('/deletetaskbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "task id is required" });
    return;
  }
  db.query(`DELETE FROM tasks WHERE taskId= ${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }
    res.json({ status: 200, message: " task deleted successfully", data: results });
  })
})


// 6. get all projects
app.get('/getallprojects', async (req, res) => {

  //firstly we create promise to get all projectsIds from given employeeId (from employeeprojects table)
  try {
    const allProjects = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM projects WHERE status = "running" OR status = "delayed" `
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const projectswithDetails = await Promise.all(allProjects.map(async (row) => {
      try {
        const allTasks = await new Promise((resolve, reject) => {
          db.query(`SELECT * from tasks WHERE projectId = ${row.projectId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });

        const allParticiepants = await new Promise((resolve, reject) => {
          const query = `
          SELECT name
          FROM employee
          WHERE employeeId IN (
            SELECT employeeId
            FROM employeeprojects
            WHERE projectId = ${row.projectId}
            );
            `
          db.query(query, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });

        // Combine project details with the row
        return { ...row, allTasks, allParticiepants };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));

    res.json({ status: 200, message: "got all the given projects", data: projectswithDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
})

//get individual project by id
app.get('/getprojectbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "project id is required" });
    return;
  }
  db.query(`SELECT * FROM projects WHERE 	projectId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      res.json({ status: 200, message: "got project successfully", data: results });
    }
  });

})

//get all project corrospond to given employeeId, along with details of each project
// so first Query is fetxhing all project assign to employee from "employeeprojects" table 
// and second query is fetching project details of each projects  
app.get('/getprojectsbyempid/:id', async (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate id " });
    return; // Add return to exit the function if ID is not valid
  }

  //firstly we create promise to get all projectsIds from given employeeId (from employeeprojects table)
  try {
    const employeeProjects = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM employeeprojects WHERE employeeId = ${req.params.id}`
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    //trying new things, continue it later

    // const query2 = `SELECT * FROM employeeprojects WHERE employeeId = ${req.params.id}`
    // const employeeProjects2= queryPromise(query2,employeeProjects)
    // .then((res)=>{
    //   console.log("res is---->",res)
    // })
    // .catch((err)=>{
    //   console.log(`error occured in ${employeeProjects} promise`)
    // })
    // console.log("employeeProjects2 is--->",employeeProjects2)

    // const projectsWithDetails2= queryPromise(query2)

    // Map over the results and fetch project details for each project
    const projectsWithDetails = await Promise.all(employeeProjects.map(async (row) => {
      try {
        const projectDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from projects WHERE projectId = ${row.projectId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result[0]);
            }
          });
        });

        const employeeDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * FROM employee WHERE employeeId=${row.employeeId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        // Combine project details with the row
        return { ...row, projectDetails, employeeDetails };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));

    res.json({ status: 200, message: "projects for given employeeId", data: projectsWithDetails });
  }
  catch (error) {
    console.log("Error fetching employee projects:", error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// fetch particulor project by project id

app.get('/getprojectsbyprojectid/:id', async (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate project id " });
    return; // Add return to exit the function if ID is not valid
  }

  //firstly we create promise to get all projectsIds from given employeeId (from employeeprojects table)
  try {
    const employeeProjects = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM employeeprojects WHERE projectId = ${req.params.id}`
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const employeesWithDetails = await Promise.all(employeeProjects.map(async (row) => {
      try {
        const employeeDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from employee WHERE employeeId = ${row.employeeId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result[0]);
            }
          });
        });
        // Combine project details with the row
        return { ...row, employeeDetails };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If employee details fetching fails, return row without details
        return row;
      }
    }));

    res.json({ status: 200, message: "projects along with employee details for given projectId", data: employeesWithDetails });
  }
  catch (error) {
    console.log("Error fetching employee projects:", error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// get projects by employeeId
app.get('/getemployeebyprojectid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate id " });
    return;
  }
  db.query(`SELECT * FROM employeeprojects WHERE 	projectId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      res.json({ status: 200, message: "employee for given projectId", data: results });
    }
  });
})

//get active projects
app.get('/getactiveprojects', (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)
  const query = `SELECT * from projects WHERE endDate> '${todayDate}'`;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      res.json({ status: 200, message: "all active projects", data: results });
    }
  });
})

//get active projects
app.get('/getdueprojects', (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)

  const query = `SELECT * from projects WHERE endDate<'${todayDate}'`;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      results.map((attend) => {
        return (
          attend.Date = convtoIST(attend.Date)
        )
      })
      res.json({ status: 200, message: "all due projects", data: results });
    }
  });
})

//---------------------------- Tasks apis starts from here-------------------------

// 5. add tasks api

//taking its documents from frontend post req
//        NOTE: here seperate folder is assigned for the storage for project docs  
const task_docs_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/task_docs');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const task_docs_upload = multer({ storage: task_docs_storage })

app.post('/addtask', task_docs_upload.array('taskDocs'), checkRequiredFields([
  "taskName",
  "taskDescription",
  "projectId",
  "priority",
  "startDate",
  "endDate",
  "assignedTo",
  "reportTo"
]), (req, res) => {

  const values = [
    req.body.taskName,
    req.body.taskDescription,
    req.body.projectId,
    req.body.priority,
    "pending",
    req.body.startDate,
    req.body.endDate,
    req.body.assignedTo,
    req.body.reportTo,
    !req.files ? "" : JSON.stringify(req.files.map(file => file.filename))
  ];

  const query = `INSERT INTO tasks ( 
    taskName,
    taskDescription,
    projectId,
    priority,
    status,
    startDate,
    endDate,
    assignedTo,
    reportTo,
    taskDocs
    ) 
    VALUES
    (?,?,?,?,
      ?,?,?,?,
      ?,?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      res.status(500).send({ message: "erro in inserting tasks.taskDocs", error: err });
      return;
    }
    res.status(200).send({ status: 200, message: 'task created sucessfully' });
  });
});

app.post('/edittask', task_docs_upload.array('taskDocs'), (req, res) => {
  const query = `UPDATE tasks 
  SET 
  taskName = '${req.body?.taskName}',
  taskDescription = '${req.body?.taskDescription}',
  projectId = '${req.body?.projectId}',
  priority = '${req.body?.priority}',
  status = '${req.body?.status}',
  startDate = '${req.body?.startDate}',
  endDate = '${req.body?.endDate}',
  assignedTo = ${req.body?.assignedTo},
  reportTo = ${req.body?.reportTo},
  taskDocs = '${req.files ? JSON.stringify(req?.files.map(file => file.filename)) : ""}'
  WHERE
    taskId = ${req.body.taskId}`

  db.query(query, (err, results) => {
    if (err) {
      res.json({ status: 500, message: "Error in updating tasks ", err });
      return;
    } else {
      res.json({ status: 200, message: "task updated successfully", data: results });
    }
  });
});

//edit task status
app.post('/edittaskstatus', task_docs_upload.none(), (req, res) => {
  const query = `UPDATE tasks 
  SET 
  projectId = '${req.body?.projectId}',
  status = '${req.body?.status}'
  WHERE
    taskId = ${req.body.taskId}`

  db.query(query, (err, results) => {
    if (err) {
      res.json({ status: 500, message: "Error in updating tasks ", err });
      return;
    }


    if (req.body?.status === "done") {
      const sub_query = `
        UPDATE projects
        SET completedTasks = completedTasks + 1
        WHERE
        projectId = ${req.body.projectId}`;

      db.query(sub_query, (err, results) => {
        if (err) {
          res.json({ status: 500, message: "Error in updating tasks ", err });
          return;
        } else {
          res.json({ status: 200, message: "task updated successfully", data: results });
        }
      });
    }
    else {
      res.json({ status: 200, message: "task updated successfully", data: results });
    }

  });
});

// get tasks by employeeId along with its assgning details
app.get('/gettasksbyempid/:id', async (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate id " });
    return; // Add return to exit the function if ID is not valid
  }

  //firstly we create promise to get all projectsIds from given employeeId (from employeeprojects table)
  try {
    const employeeTask = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM tasks WHERE assignedTo = ${req.params.id}`
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const projectsDetails = await Promise.all(employeeTask.map(async (row) => {
      try {
        const taskDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from projects WHERE projectId = ${row.projectId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result[0]);
            }
          });
        });

        const employeeDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from employee WHERE employeeId = ${row.assignedTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const mentorDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from employee WHERE employeeId = ${row.reportTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        // Combine project details with the row
        return { ...row, taskDetails, employeeDetails, mentorDetails };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));

    res.json({ status: 200, message: "projects for given employeeId", data: projectsDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});


//get task by id

app.get('/gettaskbyid/:id', async (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate id " });
    return; // Add return to exit the function if ID is not valid
  }

  //firstly we create promise to get all projectsIds from given employeeId (from employeeprojects table)
  try {
    const tasks = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM tasks WHERE taskId = ${req.params.id}`
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const taskDetails = await Promise.all(tasks.map(async (row) => {
      try {
        const employeeDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from employee WHERE employeeId = ${row.assignedTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const mentorDetails = await new Promise((resolve, reject) => {
          db.query(`SELECT * from employee WHERE employeeId = ${row.reportTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        // Combine project details with the row
        return { ...row, employeeDetails, mentorDetails };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));

    res.json({ status: 200, message: "projects for given employeeId", data: taskDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});


// 6. get all tasks
app.get('/getalltasks', async (req, res) => {
  //firstly we create promise to get all projectsIds from given employeeId (from employeeprojects table)
  try {
    const pendingTasks = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM tasks WHERE 1`
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const allTaskswithDetails = await Promise.all(pendingTasks.map(async (row) => {
      try {
        const assignedTo = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.assignedTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const reportTo = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.reportTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const projectName = await new Promise((resolve, reject) => {
          db.query(`SELECT ProjectName from projects WHERE projectId = ${row.projectId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        // Combine project details with the row
        return { ...row, assignedTo, reportTo, projectName };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));
    allTaskswithDetails.forEach((task) => {
      task.startDate = convtoIST(task.startDate);
      task.endDate = convtoIST(task.endDate);
    });
    res.json({ status: 200, message: "projects for given employeeId", data: allTaskswithDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
})

//get active tasks
app.get('/getactivetasks', async (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)

  try {
    const activeTasks = await new Promise((resolve, reject) => {
      const query = `SELECT * from tasks WHERE endDate> '${todayDate}'`;
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const activeTaskswithDetails = await Promise.all(activeTasks.map(async (row) => {
      try {
        const assignedTo = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.assignedTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const reportTo = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.reportTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const projectName = await new Promise((resolve, reject) => {
          db.query(`SELECT ProjectName from projects WHERE projectId = ${row.projectId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        // Combine project details with the row
        return { ...row, assignedTo, reportTo, projectName };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));
    activeTaskswithDetails.forEach((task) => {
      task.startDate = convtoIST(task.startDate);
      task.endDate = convtoIST(task.endDate);
    });
    res.json({ status: 200, message: "projects for given employeeId", data: activeTaskswithDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
})

//get due tasks
app.get('/getduetasks', async (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)
  try {
    const dueTasks = await new Promise((resolve, reject) => {
      const query = `SELECT * from tasks WHERE endDate<='${todayDate}'`;
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Map over the results and fetch project details for each project
    const dueTaskswithDetails = await Promise.all(dueTasks.map(async (row) => {
      try {
        const assignedTo = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.assignedTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const reportTo = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.reportTo}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        const projectName = await new Promise((resolve, reject) => {
          db.query(`SELECT ProjectName from projects WHERE projectId = ${row.projectId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
        // Combine project details with the row
        return { ...row, assignedTo, reportTo, projectName };
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }));
    dueTaskswithDetails.forEach((task) => {
      task.startDate = convtoIST(task.startDate);
      task.endDate = convtoIST(task.endDate);
    });
    res.json({ status: 200, message: "projects for given employeeId", data: dueTaskswithDetails });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
})

//get task by projectId
const { getTasksbyprojectId } = require('./controllers/commonControls/tasks.js')
app.get('/gettasksbyprojectid/:id', getTasksbyprojectId)

//---------------------> leaves apis starts here <----------------------
// 7. apply leave API

//taking its documents from frontend post req
//        NOTE: here seperate folder is assigned for the storage for leave docs  
const leave_docs_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/leave_docs');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const leave_docs_upload = multer({ storage: leave_docs_storage })

app.post('/addleave', leave_docs_upload.single('leave_doc'), checkRequiredFields([
  "empId",
  "leaveType",
  "noOfDays",
  "startDate",
  "endDate",
  "reason"
]), (req, res) => {
  const values = [
    req.body.empId,
    req.body.leaveType,
    req.body.noOfDays,
    req.body.startDate,
    req.body.endDate,
    req.body.reason,
    !req.file ? "" : req.file.filename
  ];

  const query = `INSERT INTO leaves ( 
    empId,
    leaveType,
    noOfDays,
    startDate,
    endDate,
    reason,
    leave_doc
    ) 
    VALUES
    (?,?,?,?,
    ?,?,?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into leaves:', err);
      res.status(500).send({ message: "erro in inserting leave", error: err });
      return;
    }
    console.log('Data inserted into tasks table:', result);
    res.status(200).send({ status: 200, message: 'insertion success in leave table', document: req.body });
  });
});

// 8. update leave status
app.post('/approveleave', checkRequiredFields([
  "update",
  "leaveId"
]), (req, res) => {
  const { update, leaveId } = req.body;
  const query = `UPDATE leaves SET status = ? WHERE leaveId = ?`

  db.query(query, [update, leaveId], (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).json({ error: 'error updating leave status' });
      return;
    }
    res.status(200).json({ status: 200, message: 'leave status updated', status: req.body.update });
  })
})

// 9. get all leaves
app.get('/getleaves', (req, res) => {
  //sql query to reteive all the documents of table

  const today = new Date();
  const { todayDate } = getDate(today)
  console.log(todayDate)

  const query = `SELECT * FROM leaves WHERE  endDate>='${todayDate}' AND status='approve'`;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ message: 'can not retrieve leaves',error:err });
      return;
    }
    results.forEach((row) => {
      row.startDate = convtoIST(row.startDate)
      row.endDate = convtoIST(row.endDate)
    })
    res.json({ status: 200, message: "got all leaves successfully", data: results });

  });

})

//get leave requests for the admin
app.get('/getleaverequests', async (req, res) => {

  const leaveRequests = await new Promise((resolve, rejects) => {

    const query = "SELECT * FROM `leaves` WHERE status='pending' ORDER BY leaveId DESC";

    db.query(query, (err, results) => {
      if (err) {
        rejects(err)
      } else {
        resolve(results)
      }
    });
  })

  const leaveRequestswithNames = await Promise.all(leaveRequests.map(async (row) => {
    try {
      const leaveRequestBy = await new Promise((resolve, rejects) => {

        db.query(`SELECT name from employee WHERE employeeId = ${row.empId}`, (err, result) => {
          if (err) {
            rejects(err);
          } else {
            resolve(result[0]);
          }
        });
      })
      return { ...row, leaveRequestBy }
    } catch (error) {
      console.log("Error fetching project details:", error);
      // If project details fetching fails, return row without details
      return row;
    }
  }))
  leaveRequestswithNames.forEach((row) => {
    console.log(row.startDate)
    row.startDate = convtoIST(row.startDate)
    row.endDate = convtoIST(row.endDate)
  })
  res.json({ status: 200, message: "projects for given employeeId", data: leaveRequestswithNames });
})

//leave on today

app.get('/getleavesoftoday', async (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)

  const todaysleaves = await new Promise((resolve, reject) => {
    const query = `SELECT * FROM leaves WHERE  '${todayDate}' BETWEEN startDate  AND endDate AND (status='approve')`
    db.query(query, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });

  const leavesWithDetails = await Promise.all(todaysleaves.map(async (row) => {

    try {
      const leavesDetail = await new Promise((resolve, reject) => {
        db.query(`SELECT * from employee WHERE employeeId = ${row.empId}`, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result[0]);
          }
        });
      });
      // Combine project details with the row
      return { ...row, leavesDetail };
    }

    catch (error) {
      console.log("Error fetching project details:", error);
      // If project details fetching fails, return row without details
      return row;
    }
  }));
  leavesWithDetails.forEach((row) => {
    console.log(row.startDate)
    row.startDate = convtoIST(row.startDate)
    row.endDate = convtoIST(row.endDate)
  })




  res.json({ status: 200, message: "projects for given employeeId", data: leavesWithDetails });
})

app.get('/getbirthdays', (req, res) => {
  const query = `SELECT name, date_of_birth, profilePic 
  FROM employee
  WHERE 
  (
    MONTH(date_of_birth) = MONTH(CURDATE())
          AND DAY(date_of_birth) >= DAY(CURDATE())
          )
          OR
      (
          MONTH(date_of_birth) = MONTH(DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
          AND DAY(date_of_birth) < DAY(DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
      );
      `
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'can not retrieve leaves of today' });
      return;
    }

    results.forEach((row) => {
      row.date_of_birth = convtoIST(row.date_of_birth);
    });

    res.json({ status: 200, message: "got birthdays successfully", data: results });

  })
})
app.get('/getanniversaries', (req, res) => {
  const query = `SELECT name, date_of_joining,profilePic 
  FROM employee
  WHERE 
      (
          MONTH(date_of_joining) = MONTH(CURDATE())
          AND DAY(date_of_joining) >= DAY(CURDATE())
      )
      OR
      (
          MONTH(date_of_joining) = MONTH(DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
          AND DAY(date_of_joining) < DAY(DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
      );  
      `
  db.query(query, (err, results) => {

    if (err) {
      res.status(500).json({ error: 'can not retrieve anniversary' });
      return;
    }

    results.forEach(row => row.date_of_joining = convtoIST(row.date_of_joining))
    const filteredResults = results.filter(row => {
      const joiningDate = new Date(row.date_of_joining); // Convert to Date object
      const todayDate = new Date(); // Get current date

      // Check if joining date is not today
      if (
        joiningDate.getFullYear() === todayDate.getFullYear() &&
        joiningDate.getMonth() === todayDate.getMonth() &&
        joiningDate.getDate() === todayDate.getDate()
      ) {
        return false; // Exclude if joining date is today
      }

      return true; // Include all other dates
    });
    res.json({ status: 200, message: "got anniversaries successfully", data: filteredResults });

  })
})


//get leaves by employeeId
app.get('/getleavesbyempid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate id " });
  }
  db.query(`SELECT * FROM leaves WHERE empId =${req.params.id} ORDER BY leaveId DESC`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    } else {
      results.forEach((row) => {
        console.log(row.startDate)
        row.startDate = convtoIST(row.startDate)
        row.endDate = convtoIST(row.endDate)
      })
      res.json({ status: 200, message: "got all leaves of employee sucessfully", data: results });
    }
  });
})

//---------------------  all Clock APIs starts here-----------------------------

// all over attendence module
const { getattendencebyempid } = require('./controllers/adminControls/attendence.js')
app.post('/getattendencebyempid', project_docs_upload.none(), getattendencebyempid)

const { clockOut, clockIn, clockinstatus } = require('./controllers/employeeControls/clocktimes.js')
app.post('/clockin', clockIn)
app.post('/clockout', checkRequiredFields(["employeeId"]), clockOut)
app.post('/clockinstatus', checkRequiredFields(["employeeId"]), clockinstatus)




//12. -------->break start API
app.post('/breakstart', checkRequiredFields(["employeeId"]), (req, res) => {
  const today = new Date();
  const { currentTime, todayDate } = getDate(today)
  const values = [
    req.body.employeeId,
    todayDate,
    currentTime,
  ];
  const query = `INSERT INTO breaks
  (
    employeeId,
    Date,
    breakStart
  ) VALUES
  (
    ?,?,?
  )`

  db.query(query, values, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'break starts error' });
      return;
    }
    res.status(200).json({ status: 200, message: 'break starts' });
  })
})

//13. -------->ending the break API

app.post('/breakend', checkRequiredFields(["employeeId"]), (req, res) => {
  var today = new Date();
  const { currentTime } = getDate(today)

  db.query(`SELECT * from breaks WHERE employeeId=${req.body.employeeId} AND 	breakEnd="00:00:00"`, (err, results) => {
    if (results.length == 0) {
      res.status(400).json({ message: 'employee has not started break' });
      return;
    }

    const query = `UPDATE breaks 
                 SET breakEnd = '${currentTime}' 
                 WHERE 
                 employeeId = '${req.body.employeeId}'
                 AND breakEnd = '00:00:00'`;
    db.query(query, (err, results) => {
      if (err) {
        res.status(500).json({ error: 'break ends error' });
        return;
      }
      res.status(200).json({ status: 200, message: 'breaks ends' });
    })
  })


})

// get breaks by employeeId
app.get('/getbreaksbyemployeeId/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "please provide appropriate id " });
    return
  }
  db.query(`SELECT * FROM breaks WHERE employeeId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }
    res.json({ status: 200, message: "breaks for given employee", data: results });

  });
})


// --------------> requests generation api <------------------

// 14. create general request API
// here is the API with regards to general structure of any request (late clockin, employee profile update or any future request type )

//  creating storage space for leave request 
const requests_docs_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/requests_docs');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const requests_docs_upload = multer({ storage: requests_docs_storage })

app.post('/createrequest', requests_docs_upload.single('value'), checkRequiredFields([
  "employeeId",
  "type",
  "description",
  "keyname"
]), (req, res) => {

  const values = [
    req.body.employeeId,
    req.body.type,//can be clocktime,update_employee
    req.body.description,
    req.body.Date == undefined ? new Date().getDate() : req.body.Date,
    req.body.keyname,
    !req.file ? req.body.value : req.file.filename
  ];
  const query = `INSERT INTO requests ( 
    employeeId,
    type,
    description,
    Date,
    keyname,
    value
    ) 
    VALUES
    (?,?,?,?,
    ?,?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      res.status(500).send({ message: "erro in inserting request", error: err });
      return;
    }
    res.status(200).send({ status: 200, message: 'request created successfully', document: req.body });
  });
});

// 15. update request status
app.post('/updaterequest', checkRequiredFields([
  "requestId",
  "update",
  "type"
]), (req, res) => {
  //getting data first to get keyname and value for updation in destination folder
  const getemployee_query = `SELECT  *  FROM requests WHERE requestId=${req.body.requestId};`

  db.query(getemployee_query, (err, result) => {
    if (err) {
      res.status(500).send({ message: "can not find request for given data", error: err });
      return;
    }
    result[0].Date = convtoIST(result[0].Date)

    //if request is rejected then execute this
    if (req.body.update === "reject") {
      const query = `UPDATE requests SET status = "${req.body.update}" WHERE requestId = ${req.body.requestId}`

      db.query(query, (err, result) => {
        if (err) {
          res.status(500).send({ message: "erro in inserting request", error: err });
          return;
        }
        return res.status(200).send({ status: 200, message: `request ${req.body.update} successfully`, document: req.body });
      });
    }

    //if request is approved then execute this
    else {
      if (req.body.type == "clocktime") {
        console.log(result[0])
        const query = `UPDATE requests SET status = "${req.body.update}" WHERE requestId = ${req.body.requestId}`

        const formattedDate = result[0].Date.toISOString().slice(0, 10);
        const sub_query = `UPDATE attendence SET ${result[0].keyname} = "${result[0].value}" WHERE 	employeeId = ${result[0].employeeId} AND Date= "${formattedDate}"`;
        console.log(sub_query)

        Promise.all([
          executeQuery(query),
          executeQuery(sub_query)
        ])
          .then(results => {
            // Combine the results into a single object
            const combinedData = {
              request_updation: results[0],
              data_updation: results[1]
            };

            // Send the combined data as a response
            res.json({ status: 200, message: `request ${req.body.update} successfully`, data: combinedData });
          })
          .catch(error => {
            res.status(500).json({ error: 'Internal server error', message: error });
          });
      }
      else if (req.body.type == "update_employee") {
        const query = `UPDATE requests SET status = "${req.body.update}" WHERE requestId = ${req.body.requestId}`
        const sub_query = `UPDATE employee SET ${result[0].keyname} = "${result[0].value}" WHERE employeeId  = ${result[0].employeeId}`

        Promise.all([
          executeQuery(query),
          executeQuery(sub_query)
        ])
          .then(results => {
            // Combine the results into a single object
            const combinedData = {
              request_updation: results[0],
              data_updation: results[1]
            };

            // Send the combined data as a response
            res.json({ status: 200, message: `request ${req.body.update} successfully`, data: combinedData });
          })
          .catch(error => {
            res.status(500).json({ error: 'Internal server error', message: error });
          });
      }

      //funcation to create Promise for the query
      function executeQuery(query) {
        return new Promise((resolve, reject) => {
          db.query(query, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
      }

    }

  });
})

// 16. get all request
app.get('/getrequests', (req, res) => {
  //sql query to reteive all the documents of table
  const query = "SELECT * FROM `requests` WHERE 1";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ status: 400, error: err });
      return;
    }
    res.json({ status: 200, message: "got the requests ", data: results });

  });

})

// get request by id
app.get('/getrequestbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "request id is required" });
  }
  db.query(`SELECT * FROM requests WHERE 	requestId =${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
    }
    res.json({ status: 200, message: "got request successfully", data: results });

  });

})

app.post('/getrequestsbytype', async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
      db.query(`SELECT * FROM requests WHERE type = '${req.body.type}' AND status = 'pending' ORDER BY requestId DESC`, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (results.length === 0) {
      res.json({ status: 500, message: `No requests found for the given type` });
      return;
    }

    for (let index = 0; index < results.length; index++) {
      const request = results[index];
      request.Date= convtoIST(request.Date)
      try {
        const employeeResult = await new Promise((resolve, reject) => {
          db.query(`SELECT name FROM employee WHERE employeeId = ${request.employeeId}`, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        request.employeeName = employeeResult[0].name;
      } catch (err) {
        console.error("Error fetching employee name:", err);
        request.employeeName = "Unknown";
      }
    }

    res.json({ status: 200, message: `Got requests for ${req.body.type} successfully`, data: results });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: 'Internal server error', message: err });
  }
});

//get all request
app.get('/getallrequests', (req, res) => {
  //sql query to reteive all the documents of table
  const query = "SELECT * FROM `requests` WHERE 1";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Error fetching in data from my sql: ', err);
      return;
    }
    res.json({ status: 200, message: "got requests successfully", data: results });

  });
})

//get all pending request
app.get('/getpendingrequests', async (req, res) => {
  //sql query to reteive all the documents of table
  try {
    const requests = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM requests WHERE status = 'pending' ORDER BY requestId DESC`;
      db.query(query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    })


    const pendingRequestwithDetails = await Promise.all(requests.map(async (row) => {
      try {
        const reuestby = await new Promise((resolve, reject) => {
          db.query(`SELECT name from employee WHERE employeeId = ${row.employeeId}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result[0]);
            }
          });
        })

        return { ...row, reuestby }
      } catch (error) {
        console.log("Error fetching project details:", error);
        // If project details fetching fails, return row without details
        return row;
      }
    }))
    res.json({ status: 200, message: "all pending requests", data: pendingRequestwithDetails });

  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });

  }
})



// ---------------------> announcements APIs starts here <-------------------

// 17. create announcements 
const announcements_docs_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/announcements_docs');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const announcements_docs_upload = multer({ storage: announcements_docs_storage })

app.post('/addannouncements', announcements_docs_upload.array('announcements_docs'), checkRequiredFields([
  "title",
  "message",
]), (req, res) => {
  const values = [
    !req.body.type ? "general" : req.body.type,
    req.body.title,
    req.body.message,
    req.body.announcement_date,
    !req.files ? "" : JSON.stringify(req.files.map(file => file.filename))
  ];

  const query = `INSERT INTO announcements ( 
    type,
    title,
    message,
    announcement_date,
    announcement_docs
    ) 
    VALUES
    (?,?,?,?,
      ?)`;

  db.query(query, values, (err, result) => {
    if (err) {
      res.status(500).send({ message: "erro in inserting leave", error: err });
      return;
    }
    res.status(200).send({ status: 200, message: 'insertion success in announcements table', document: req.body });
  });
});


const holiday_docs_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/holiday_docs');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const holiday_docs_upload = multer({ storage: holiday_docs_storage })

const { createHoliday, getAllHolidays, getHolidaysbyId, updateHoliday, deleteHoliday } = require('./controllers/adminControls/holidays.js')
app.post('/createholiday', holiday_docs_upload.array('holidayDocs'), createHoliday)
app.get('/getallholidays', getAllHolidays)
app.get('/getholidaysbyid/:id', getHolidaysbyId)
app.post('/updateholiday', holiday_docs_upload.array('holidayDocs'), updateHoliday)
app.get('/deleteholiday/:id', deleteHoliday)

const emptyUpload = multer();
const { createPolicy, getAllPolicies, updatePolicy, deletePolicy, getAllPoliciesbyId } = require('./controllers/adminControls/policies.js');
app.post('/createpolicy', upload.none(), createPolicy)
app.get('/getallpolicies', getAllPolicies)
app.get('/getallpoliciesbyid/:id', getAllPoliciesbyId)
app.post('/updatepolicy', upload.none(), updatePolicy)
app.get('/deletepolicy/:id', deletePolicy)

//edit announcements by id

app.post('/editannouncements', announcements_docs_upload.array('announcements_docs'), (req, res) => {
  const query = `UPDATE announcements 
  SET 
    type='${req.body?.type}',
    title='${req.body?.title}',
    message = '${req.body?.message}',
    announcement_date = '${req.body?.announcement_date}',
    announcement_docs = '${JSON.stringify(req?.files.map(file => file.filename))}'
    WHERE
    announcementId = ${req.body.announcementId}`;



  db.query(query, (err, results) => {
    if (err) {
      console.log(err)
      res.json({ status: 500, message: "Error in updating announcement ", err });
      return;
    } else {
      res.json({ status: 200, message: "announcement updated successfully", data: results });
    }
  });
});

// 18. get all announcements
app.get('/getannouncements', (req, res) => {
  //sql query to reteive all the documents of table
  const query = "SELECT * FROM `announcements` WHERE 1";
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'can not retrieve announcements' });
    }
    res.json({ status: 200, message: "got all announcements successfully", data: results });
  });

})
//get announcements 
app.get('/getannouncementbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    return res.status(400).json({ message: "announcement id is required" });
  }
  db.query(`SELECT * FROM announcements WHERE announcementId = ${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }
    res.json({ status: 200, message: " announcement got successfully", data: results });
  })
})
//delete announcements 
app.get('/deleteannouncementbyid/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.status(400).json({ message: "announcement id is required" });
    return;
  }
  db.query(`DELETE FROM announcements WHERE announcementId = ${req.params.id}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error', message: err });
      return;
    }

    res.json({ status: 200, message: " announcement deleted successfully", data: results });

  })

})
//19. get holidays
app.get('/getholidays', (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)

  //sql query to reteive all the documents of table
  const query = `SELECT * FROM announcements WHERE type="holiday" AND announcement_date>'${todayDate}' `
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'can not retrieve holidays' });
      return;
    }
    res.json({ status: 200, message: "got all announcements successfully", data: results });
  });
})
//get today's present employees 
const { presentToday } = require('./controllers/adminControls/attendence.js')
app.post('/presenttoday', presentToday)

//get today's absent employees 
app.get('/getabsents', async (req, res) => {
  const today = new Date();
  const { todayDate } = getDate(today)

  const query = `
  SELECT employee.employeeId, employee.name 
  FROM employee 
  LEFT JOIN (
      SELECT employeeId
      FROM attendence
      WHERE Date = '${todayDate}'
      UNION 
      SELECT empId
      FROM leaves
      WHERE status = 'approve' AND startDate = ' ${todayDate} ' 
  ) AS union_result
  ON employee.employeeId = union_result.employeeId 
  WHERE union_result.employeeId IS NULL;
  
  `
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'can not retrieve absents employee' });
      return;
    }
    res.json({ status: 200, message: "got all absent employee sucessfull", data: results });
  });
})

//workingHours APIS

const { createworkingHours, getworkingHours, updateWorkingHours, deleteWorkingHours, getworkingHoursbyId } = require('./controllers/adminControls/workinghours.js');
app.post('/createworkinghours', holiday_docs_upload.none(), createworkingHours)
app.get('/getworkinghours', getworkingHours)
app.get('/getworkinghoursbyid/:id', getworkingHoursbyId)
app.post('/updateworkinghours', holiday_docs_upload.none(), updateWorkingHours)
app.get('/deleteworkinghours/:id', deleteWorkingHours)

//salary APIs
const { createSalarybyempId, getSalarybysalaryId, getallSalaries } = require('./controllers/adminControls/salary.js')
app.post('/createsalarybyempid', announcements_docs_upload.none(), createSalarybyempId)
app.get('/getsalarybysalaryid/:id', getSalarybysalaryId)
app.get('/getallsalaries', getallSalaries)

//notifications API
const { createNotification, getNotificationbyemployeeId, seeNotificationbyId } = require('./controllers/commonControls/notifications.js')
app.post('/createNotification', announcements_docs_upload.none(), createNotification)
app.get('/getnotificationbyemployeeid/:id', getNotificationbyemployeeId)
app.get('/seenotificationbyid/:id', seeNotificationbyId)

//listening app
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
