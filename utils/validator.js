// Middleware function to check if all required fields are present in req.body
 const checkRequiredFields = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = [];
        const missingDocs = [];
        requiredFields.forEach(field => {
            if (!(field in req.body)) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({ error: `Missing required fields`,field:`${missingFields.join(', ')}` });
        }

        // If all required fields are present, proceed to the next middleware
        next();
    };
};

module.exports=checkRequiredFields;
