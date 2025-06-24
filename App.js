// STEP 1: Load environment variables
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const port = 3000; // This should probably be 3000 unless you're exposing MySQL via your app (not recommended)

// Setup view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware for parsing data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL config
const config = {
    host: process.env.DB_HOST, // was DB_SERVER incorrectly
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 3306
};

// Connect to DB once (optional pooling can be added later)
let pool;

async function connectToMySQL() {
    try {
        pool = await mysql.createPool(config);
        console.log('✅ Connected to MySQL database!');
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
    }
}

// Start the server
app.listen(3000, () => {
    console.log('🚀 Server is running on port 3000');
});

connectToMySQL();

// Routes
app.get('/', (req, res) => {
    res.render('home');
});

app.post('/submit-verification', async (req, res) => {
    console.log('--- Inside /submit-verification POST handler ---');
    console.log('Raw req.body:', req.body);

    try {
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

        const insertQuery = `
            INSERT INTO Verifications (
                RequestingCompanyName, YourName, YourTitle, YourEmail, RequestDate,
                EmployeeFullName, EmployeeDOB, EmployeePositionApplied,
                PreviousCompanyName, PreviousCompanyContact, PreviousCompanyAddress,
                EmploymentStartDate, EmploymentEndDate, PositionHeld, SalaryAtDeparture,
                ReasonForLeaving, EligibleForRehire, PerformanceComments, AdditionalComments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
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
        ];

        const [result] = await pool.execute(insertQuery, values);

        console.log('✅ Verification saved successfully!', result);
        res.render('success');
    } catch (error) {
        console.error('❌ Error saving verification:', error);
        res.status(500).render('error', { errorMessage: error.message });
    }
});