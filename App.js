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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);

const pool = mysql.createPool({
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace('/', ''),
    port: dbUrl.port || 3306
});

// DB connection test
async function connectToMySQL() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database!');
        connection.release();
    } catch (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
    }
}
connectToMySQL();

// Sanitize utility
const sanitize = (value) => (value === undefined || value === '' ? null : value);

// Home route
app.get('/', (req, res) => {
    res.render('home'); // expects views/home.ejs
});

// POST: Submit Verification
app.post('/submit-verification', async (req, res) => {
    try {
        const {
            employee_full_name,
            designation,
            employment_start_date,
            employment_end_date,
            last_working_day,
            last_drawn_ctc,
            take_home_salary,
            overall_performance,
            work_ethic_and_punctuality,
            team_collaboration,
            client_handling,
            workplace_behavior,
            disciplinary_actions,
            reason_for_leaving,
            was_on_pip,
            exit_status,
            eligible_for_rehire
        } = req.body;

        const insertQuery = `
            INSERT INTO Employee_Verify (
                EmployeeFullName, Designation, EmploymentStartDate, EmploymentEndDate, LastWorkingDay,
                LastDrawnCTC, TakeHomeSalary,
                OverallPerformance, WorkEthicAndPunctuality, TeamCollaboration,
                ClientHandling, WorkplaceBehavior, DisciplinaryActions,
                ReasonForLeaving, WasOnPIP, ExitStatus, EligibleForRehire
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            sanitize(employee_full_name),
            sanitize(designation),
            sanitize(employment_start_date),
            sanitize(employment_end_date),
            sanitize(last_working_day),
            sanitize(last_drawn_ctc),
            sanitize(take_home_salary),
            sanitize(overall_performance),
            sanitize(work_ethic_and_punctuality),
            sanitize(team_collaboration),
            sanitize(client_handling),
            sanitize(workplace_behavior),
            sanitize(disciplinary_actions),
            sanitize(reason_for_leaving),
            sanitize(was_on_pip),
            sanitize(exit_status),
            sanitize(eligible_for_rehire)
        ];

        const [result] = await pool.execute(insertQuery, values);
        console.log('✅ Verification inserted:', result.insertId);
        res.render('success'); // expects views/success.ejs
    } catch (error) {
        console.error('❌ Error saving verification:', error);
        res.status(500).render('error', { errorMessage: error.message }); // views/error.ejs
    }
});

// GET: View Submissions (with optional search)
app.get('/submissions', async (req, res) => {
    const search = req.query.search || '';
    try {
        const [rows] = await pool.execute(
            `SELECT id, EmployeeFullName, Designation, EmploymentStartDate, EmploymentEndDate, LastWorkingDay,
                    LastDrawnCTC, TakeHomeSalary,
                    OverallPerformance, WorkEthicAndPunctuality, TeamCollaboration,
                    ClientHandling, WorkplaceBehavior, DisciplinaryActions,
                    ReasonForLeaving, WasOnPIP, ExitStatus, EligibleForRehire
             FROM Employee_Verify
             WHERE EmployeeFullName LIKE ?
             ORDER BY id DESC`,
            [`%${search}%`]
        );

        res.render('submissions', { data: rows, search }); // views/submissions.ejs
    } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        res.status(500).render('error', { errorMessage: error.message });
    }
});

// POST: Delete Submission
app.post('/delete/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Employee_Verify WHERE id = ?', [req.params.id]);
        res.redirect('/submissions');
    } catch (error) {
        console.error('❌ Error deleting submission:', error);
        res.status(500).render('error', { errorMessage: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
