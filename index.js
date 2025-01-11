if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Authority = require('./models/Authority');
const Issue = require('./models/Issue'); // Assuming Issue model is in './models/Issue'

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.DB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
  });

app.use(express.json());

// Middleware to authenticate user and extract userId
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Authorization token is missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // Attach user ID to request object
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};


app.get('/', (req, res) => {
    res.send('Hello World!');
    }); 
// Registration Route for Citizen
app.post('/api/register/citizen', async (req, res) => {
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
app.post('/api/register/authority', async (req, res) => {
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
app.post('/api/login', async (req, res) => {
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

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Issue Creation Route (with submittedBy)
app.post("/api/issues", authenticateToken, async (req, res) => {
  const { title, description, location, assignedTo } = req.body;
  const raisedBy = req.userId; // Extracted from the token middleware

  try {
    const user = await User.findById(raisedBy);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Create a new issue with the user's name as submittedBy
    const newIssue = new Issue({
      title,
      description,
      location,
      raisedBy,
      submittedBy: user.name,  // Add the user's name
      assignedTo,
    });

    await newIssue.save();
    res.status(201).json(newIssue);
  } catch (error) {
    console.error("Error creating issue:", error);
    res.status(500).json({ error: "Error creating issue" });
  }
});

// Retrieve Issues (Get route example)
app.get("/api/issues", async (req, res) => {
  try {
    const issues = await Issue.find().populate("raisedBy", "name email").exec();
    res.status(200).json(issues);
  } catch (error) {
    console.error("Error retrieving issues:", error);
    res.status(500).json({ error: "Error retrieving issues" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
