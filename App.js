// STEP 1: Ensure this is the FIRST line in your main application file
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');
const port = 8000;

const app = express();

// --- DEBUGGING STEP: Log the environment variables ---
// console.log('--- Environment Variables Check ---');
// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '********' : 'NOT SET'); // Don't log actual password
// console.log('DB_SERVER:', process.env.DB_SERVER);
// console.log('DB_DATABASE:', process.env.DB_DATABASE);
// console.log('DB_PORT:', process.env.DB_PORT);
// console.log('-----------------------------------');

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// IMPORTANT: Add middleware to parse JSON bodies
app.use(express.json()); // <--- ADD THIS LINE FOR JSON PAYLOADS
app.use(express.urlencoded({ extended: true })); // Keep this for URL-encoded form data

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// --- DEBUGGING STEP: Log the final config object before connection ---
// console.log('--- Final Config Object ---');
// console.log({
//     user: config.user,
//     server: config.server,
//     database: config.database,
//     port: config.port,
//     options: config.options,
//     pool: config.pool
// });
// console.log('---------------------------');

async function connectToSql() {
    try {
        if (!config.server) {
            throw new Error("Configuration error: 'server' property is missing or not a string. Check your .env file and dotenv setup.");
        }
        await sql.connect(config);
        console.log('Successfully connected to SQL Server using environment variables!');

        const result = await sql.query`SELECT @@SERVERNAME AS ServerName`;
        console.log('Connected to SQL Server instance:', result.recordset[0].ServerName);

    } catch (err) {
        // console.error('Database connection or query failed:', err.message);
        // console.error('Full error details:', err);
        // console.error('Current config server value:', config.server);
    } finally {
        // sql.close(); // Only if you want to close the poolI wnat to render  after this script runs
    }
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

connectToSql();

app.get('/', (req, res) => {
    res.render('home')
})

app.post('/submit-verification', async (req, res) => {
    console.log('--- Inside /submit-verification POST handler ---');
    console.log('Request Headers:', req.headers); // See what headers Express received
    console.log('Raw req.body:', req.body); // Log the body BEFORE destructuring

    try {
        // Destructure form data from request body
        const {
            requesting_company_name,
            your_name,
            your_title,
            your_email,
            request_date,
            employee_full_name,
            employee_dob,
            employee_position_applied,
            previous_company_name,
            previous_company_contact,
            previous_company_address,
            employment_start_date,
            employment_end_date,
            position_held,
            salary_at_departure,
            reason_for_leaving,
            eligible_for_rehire,
            performance_comments,
            additional_comments
        } = req.body;

        // Get the SQL Server connection pool
        const pool = await sql.connect(config);
        const request = pool.request();

        // Add parameters to the request to prevent SQL injection
        request.input('requesting_company_name', sql.NVarChar, requesting_company_name);
        request.input('your_name', sql.NVarChar, your_name);
        request.input('your_title', sql.NVarChar, your_title);
        request.input('your_email', sql.NVarChar, your_email);
        request.input('request_date', sql.Date, request_date); // Use sql.Date for date type

        request.input('employee_full_name', sql.NVarChar, employee_full_name);
        request.input('employee_dob', sql.Date, employee_dob || null);
        request.input('employee_position_applied', sql.NVarChar, employee_position_applied || null);

        request.input('previous_company_name', sql.NVarChar, previous_company_name);
        request.input('previous_company_contact', sql.NVarChar, previous_company_contact || null);
        request.input('previous_company_address', sql.NVarChar, previous_company_address || null);

        request.input('employment_start_date', sql.Date, employment_start_date || null);
        request.input('employment_end_date', sql.Date, employment_end_date || null);
        request.input('position_held', sql.NVarChar, position_held || null);
        request.input('salary_at_departure', sql.NVarChar, salary_at_departure || null);
        request.input('reason_for_leaving', sql.NVarChar, reason_for_leaving || null);
        request.input('eligible_for_rehire', sql.NVarChar, eligible_for_rehire || null);
        request.input('performance_comments', sql.NVarChar, performance_comments || null);
        request.input('additional_comments', sql.NVarChar, additional_comments || null);

        const insertQuery = `
            INSERT INTO Verifications (
                RequestingCompanyName, YourName, YourTitle, YourEmail, RequestDate,
                EmployeeFullName, EmployeeDOB, EmployeePositionApplied,
                PreviousCompanyName, PreviousCompanyContact, PreviousCompanyAddress,
                EmploymentStartDate, EmploymentEndDate, PositionHeld, SalaryAtDeparture,
                ReasonForLeaving, EligibleForRehire, PerformanceComments, AdditionalComments
            ) VALUES (
                @requesting_company_name, @your_name, @your_title, @your_email, @request_date,
                @employee_full_name, @employee_dob, @employee_position_applied,
                @previous_company_name, @previous_company_contact, @previous_company_address,
                @employment_start_date, @employment_end_date, @position_held, @salary_at_departure,
                @reason_for_leaving, @eligible_for_rehire, @performance_comments, @additional_comments
            );
        `;
        await request.query(insertQuery);

        console.log('Verification saved successfully!');

       res.render('success');
    } catch (error) {
        console.error('Error saving verification:', error);
        res.status(500).render('error', { errorMessage: error.message });
    }
});