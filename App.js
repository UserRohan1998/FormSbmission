require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const { URL } = require('url');

const app = express();
const port = process.env.PORT || 3000;


// Setup EJS views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware for form and JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Parse DATABASE_URL (from Railway or .env)
const dbUrl = new URL(process.env.DATABASE_URL); // Set this in Railway

const pool = mysql.createPool({
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace('/', ''),
    port: dbUrl.port || 3306
});

// Connect and confirm MySQL connection
async function connectToMySQL() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database!');
        await connection.release();
    } catch (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
    }
}

connectToMySQL();

const sanitize = (value) => (value === undefined || value === '' ? null : value);
// Routes
app.get('/', (req, res) => {
    res.render('home'); // assumes views/home.ejs exists
});

app.post('/submit-verification', async (req, res) => {
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
            INSERT INTO Employee_Verify (
                RequestingCompanyName, YourName, YourTitle, YourEmail, RequestDate,
                EmployeeFullName, EmployeeDOB, EmployeePositionApplied,
                PreviousCompanyName, PreviousCompanyContact, PreviousCompanyAddress,
                EmploymentStartDate, EmploymentEndDate, PositionHeld, SalaryAtDeparture,
                ReasonForLeaving, EligibleForRehire, PerformanceComments, AdditionalComments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            sanitize(requesting_company_name),
            sanitize(your_name),
            sanitize(your_title),
            sanitize(your_email),
            sanitize(request_date),
            sanitize(employee_full_name),
            sanitize(employee_dob),
            sanitize(employee_position_applied),
            sanitize(previous_company_name),
            sanitize(previous_company_contact),
            sanitize(previous_company_address),
            sanitize(employment_start_date),
            sanitize(employment_end_date),
            sanitize(position_held),
            sanitize(salary_at_departure),
            sanitize(reason_for_leaving),
            sanitize(eligible_for_rehire),
            sanitize(performance_comments),
            sanitize(additional_comments),
        ];


        const [result] = await pool.execute(insertQuery, values);
        console.log('✅ Verification inserted:', result.insertId);
        res.render('success'); // assumes views/success.ejs exists

    } catch (error) {
        console.error('❌ Error saving verification:', error);
        res.status(500).render('error', { errorMessage: error.message }); // assumes views/error.ejs exists
    }
});

app.get('/submissions', async (req, res) => {
    const search = req.query.search || '';
    try {
        const [rows] = await pool.execute(
  `SELECT id, RequestingCompanyName, YourName, YourTitle, YourEmail, RequestDate,
          EmployeeFullName, EmployeeDOB, EmployeePositionApplied,
          PreviousCompanyName, PreviousCompanyContact, PreviousCompanyAddress,
          EmploymentStartDate, EmploymentEndDate, PositionHeld, SalaryAtDeparture,
          ReasonForLeaving, EligibleForRehire, PerformanceComments, AdditionalComments
   FROM Verifications
   WHERE EmployeeFullName LIKE ? 
   OR RequestingCompanyName LIKE ?
   ORDER BY id DESC`,
  [`%${search}%`, `%${search}%`]
);

        res.render('submissions', { data: rows, search }); // views/submissions.ejs
    } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        res.status(500).render('error', { errorMessage: error.message });
    }
});

app.post('/delete/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Verifications WHERE id = ?', [req.params.id]);
        res.redirect('/submissions');
    } catch (error) {
        console.error('❌ Error deleting submission:', error);
        res.status(500).render('error', { errorMessage: error.message });
    }
});


app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
