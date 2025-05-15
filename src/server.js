// server/server.js

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Route: Register a new user (Email & Password)
app.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;

  try {
    const user = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    res.status(201).json({ message: 'User created successfully', uid: user.uid });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
});
