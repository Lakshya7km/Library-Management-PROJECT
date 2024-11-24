const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const upload = multer(); // Configure multer as needed

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'library_management'
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Endpoint to get student info
app.get('/api/student_info', (req, res) => {
    const studentId = req.session.userId;

    if (!studentId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    db.query(
        'SELECT email, roll_number, name, branch, year, semester, contact FROM users WHERE roll_number = ?',
        [studentId],
        (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (results.length > 0) {
                res.json(results[0]);
            } else {
                res.status(404).json({ error: 'Student not found' });
            }
        }
    );
});

// Endpoint to fetch all students
app.get('/api/all_students', (req, res) => {
    db.query(
        'SELECT email, roll_number, name, branch, year, semester, contact FROM users',
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching students' });
            }
            res.json(results);
        }
    );
});

// Fetch all books endpoint
app.get('/api/books', (req, res) => {
    db.query('SELECT * FROM books', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching books' });
        }
        res.json(results);
    });
});

// Get book details endpoint
app.get('/api/book/:id', (req, res) => {
    const bookId = req.params.id;
    db.query('SELECT * FROM books WHERE id = ?', [bookId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching book details' });
        }
        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ error: 'Book not found' });
        }
    });
});

// Add Book Endpoint
app.post('/api/addBook', upload.none(), (req, res) => {
    const { title, author, isbn, year, edition } = req.body;

    const sql = 'INSERT INTO books (title, author, isbn, year, edition) VALUES (?, ?, ?, ?, ?)';
    const values = [title, author, isbn, year, edition];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding book:', err);
            return res.status(500).json({ message: 'Error adding book', error: err.message });
        }
        res.status(200).json({ message: 'Book added successfully' });
    });
});

// Delete Book Endpoint
app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    db.query('DELETE FROM books WHERE id = ?', [bookId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error deleting book' });
        }
        res.status(200).json({ message: 'Book deleted successfully' });
    });
});

// Route to fetch issued books
app.get('/api/issued_books', (req, res) => {
    const query = 'SELECT * FROM issued_books';
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching issued books:', error);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Route to fetch issued books
app.get('/api/issued_books', (req, res) => {
    db.query('SELECT * FROM issued_books', (error, results) => {
        if (error) return res.status(500).json({ error });
        res.json(results);
    });
});

// Route to handle book return and update the existing record with 'Returned' status and return date
app.post('/api/return_book/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const returnDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Get the current date and time

    // First, fetch the existing issued book details using the ID
    db.query('SELECT * FROM issued_books WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(404).json({ error: 'Book not found' });

        const book = result[0];

        // Now, update the status and return date for the existing book record
        const updateQuery = `
            UPDATE issued_books 
            SET status = ?, return_date = ? 
            WHERE id = ?
        `;
        const values = ['Returned', returnDate, id];

        db.query(updateQuery, values, (err, result) => {
            if (err) return res.status(500).json({ error: 'Error updating return record' });

            // After successfully updating the book record, send the response
            res.json({ message: 'Return recorded successfully' });
        });
    });
});




// Default Route to serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration Route
app.post('/register', (req, res) => {
    const { email, roll_number, name, branch, year, semester, password, contact } = req.body;

    const query = 'INSERT INTO users (email, roll_number, name, branch, year, semester, password, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(query, [email, roll_number, name, branch, year, semester, password, contact], (err, results) => {
        if (err) {
            return res.status(500).send('Error registering user: ' + err.message);
        }
        res.send('Registration successful');
    });
});










// Get book details by ID
app.get('/api/book/:bookId', (req, res) => {
  const bookId = req.params.bookId;

  // SQL query to fetch book details by bookId
  const query = 'SELECT * FROM books WHERE book_id = ?';
  db.query(query, [bookId], (err, result) => {
    if (err) {
      console.error('Error fetching book:', err);
      return res.status(500).json({ error: 'Error fetching book details' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Send the first result of the query (book details)
    res.status(200).json(result[0]);
  });
});

// Issue book and insert into issued_books table
app.post('/api/issue-book', (req, res) => {
  const { userId, studentName, bookId, issueDate, returnDate, status } = req.body;

  // Query to insert issued book information into the issued_books table
  const query = `INSERT INTO issued_books (user_id, student_name, book_name, book_id, issue_date, return_date, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

  // Here, the correct variable should be 'bookName' instead of 'Bookname'
  const bookName = req.body.bookName; // Ensure bookName is passed in the request body

  db.query(query, [userId, studentName, bookName, bookId, issueDate, returnDate, status], (err, result) => {
    if (err) {
      console.error('Error issuing book:', err);
      return res.status(500).json({ error: 'Error issuing book' });
    }

    res.status(200).json({ message: 'Book issued successfully' });
  });
});











// Route to fetch issued books based on roll number
app.get('/api/book_history/:rollNumber', (req, res) => {
    const rollNumber = req.params.rollNumber;

    // Query to fetch issued books for the specified roll number
    const query = `
        SELECT book_name, issue_date, return_date,status
        FROM issued_books
        WHERE user_id = ?
    `;

    db.query(query, [rollNumber], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results); // Directly send the result without any changes
        }
    });
});

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/book_history.html'); // Ensure this path is correct
});


































// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).send('Error checking user credentials: ' + err.message);
        }

        if (results.length === 0 || results[0].password !== password) {
            return res.status(401).send('Invalid email or password');
        }

        req.session.userId = results[0].roll_number;
        res.redirect('/student_dashboard.html');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
