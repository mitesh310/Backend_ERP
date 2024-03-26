const db = require('../../config/db')
const convtoIST =require('../../utils/convtoIST') ;

const getTasksbyprojectId = async (req, res) => {

    try {
        const projectTasks = await new Promise((resolve, reject) => {
            const query = `SELECT * FROM tasks WHERE projectId=${req.params.id}`
            db.query(query, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        // Map over the results and fetch project details for each project
        const allTaskswithDetails = await Promise.all(projectTasks.map(async (row) => {
            try {
                const assignedTo = await new Promise((resolve, reject) => {
                    db.query(`SELECT name from employee WHERE employeeId = ${row.assignedTo}`, (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result[0]);
                        }
                    });
                });
                const reportTo = await new Promise((resolve, reject) => {
                    db.query(`SELECT name from employee WHERE employeeId = ${row.reportTo}`, (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result[0]);
                        }
                    });
                });
        
                // Combine project details with the row
                return { ...row, assignedTo, reportTo };
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
        res.json({ status: 200, message: "tasks for given projectId", data: allTaskswithDetails });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }

}

module.exports={getTasksbyprojectId}