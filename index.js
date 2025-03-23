const express = require('express');
const app = express();
const port = 5000;

// dotenv
require('dotenv').config();

// MongoDB database
const { MongoClient, ServerApiVersion } = require('mongodb');
const dbPassword = process.env.PASSWORD;
const uri = `mongodb+srv://yfaka001_dev:${dbPassword}@cluster0.tiftb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Firebase admin
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
initializeApp({
  credential: applicationDefault(),
  projectId: 'ridexpress-81cc1',
});

// JWT
const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY;

// Middlewars
// Middleware: cors
const cors = require('cors');
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  })
);
app.use(express.json()); // Request body parser middleware
// Middleware: cookie-parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Custom middlewares
const verifyToken = (req, res, next) => {
  const jwToken = req?.cookies?.token;
  if (!jwToken) {
    res.status(401).send({ message: 'Unauthorized access!' });
    return;
  }
  jwt.verify(jwToken, secretKey, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: 'Unauthorized access!' });
      return;
    } else {
      req.user = decoded;
      next();
    }
  });
};

// Testing token verification
app.get('/test', verifyToken, (req, res) => {
  console.log(req.user);
  res.send('Welcome! You are a verified user!');
});

// App is listenning on port: 5000
app.listen(5000, () => {
  console.log(`App is listening on port: ${port}`);
});

// Testing purpose:
app.get('/', (req, res) => {
  res.send('Welcome to RideXpress app!');
});

// Add user
app.post('/users', async (req, res) => {
  const { user } = req.body;
  const token = req.headers.authorization;

  getAuth()
    .verifyIdToken(token)
    .then(async (decodedToken) => {
      if (decodedToken.email === user.email) {
        const existingUser = await userCollectiion.findOne({ email: user.email });
        const jwToken = jwt.sign(user, secretKey);
        if (!existingUser) {
          userCollectiion.insertOne(user);
          res.cookie('token', jwToken, { httpOnly: true, secure: true }).send('New user added!');
        } else {
          res.cookie('token', jwToken, { httpOnly: true, secure: true }).send('User logged in!');
        }
      }
    });
});

// Log out from server
app.get('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true }).send({message: 'Cookie cleared!'});
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const database = client.db('ridexpress');
const userCollectiion = database.collection('users');
const carCollectiion = database.collection('cars');

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } catch {
    console.dir;
  }
}
run();
