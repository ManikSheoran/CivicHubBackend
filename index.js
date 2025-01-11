const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const User = require('./models/User');
const Authority = require('./models/Authority');
const Issue = require('./models/Issue');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.DB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err.message));

// Middleware
app.use(express.json());

// CORS setup
const allowedOrigins = ['https://civichub.netlify.app', 'http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secretkey', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Set to true in production
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  })
);

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
});

// Middleware to authenticate session
const authenticateSession = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = req.session.user.id;
  req.userRole = req.session.user.role;
  next();
};

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Registration Route for Citizen
app.post('/api/register/citizen', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registration Route for Authority
app.post('/api/register/authority', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('department').notEmpty().withMessage('Department is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, department } = req.body;

  try {
    const existingAuthority = await Authority.findOne({ email });
    if (existingAuthority) {
      return res.status(400).json({ error: 'Authority already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAuthority = new Authority({ name, email, password: hashedPassword, department });
    await newAuthority.save();
    res.status(201).json({ message: 'Authority registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login Route for Citizen and Authority
app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email }) || await Authority.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.user = { id: user._id, role: user.role };

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout Route
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Issue Creation Route
app.post("/api/issues", authenticateSession, async (req, res) => {
  if (req.userRole !== "citizen") {
    return res.status(403).json({ error: "Only citizens can create issues." });
  }

  const { title, description, location, assignedTo } = req.body;
  const raisedBy = req.userId;

  try {
    const user = await User.findById(raisedBy);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const newIssue = new Issue({
      title,
      description,
      location,
      raisedBy,
      submittedBy: user.name,
      assignedTo,
    });

    await newIssue.save();
    res.status(201).json(newIssue);
  } catch (error) {
    res.status(500).json({ error: "Error creating issue" });
  }
});

// Retrieve Issues
app.get("/api/issues", authenticateSession, async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate("raisedBy", "name email")
      .populate("assignedTo", "name email department")
      .select("-password")
      .exec();

    res.status(200).json(issues);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving issues" });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
