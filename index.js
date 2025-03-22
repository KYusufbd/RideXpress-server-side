const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = 5000;
require('dotenv').config();

// MongoDB database
const dbPassword = process.env.PASSWORD;
const uri = `mongodb+srv://yfaka001_dev:${dbPassword}@cluster0.tiftb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Firebase admin
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
initializeApp({
  credential: applicationDefault(),
  projectId: 'ridexpress-81cc1',
});

// Middlewars
app.use(cors());
app.use(express.json()); // Request body parser middleware

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
        if (!existingUser) {
          userCollectiion.insertOne(user);
          res.send('New user added!');
        } else {
          res.send('User logged in!');
        }
      }
    });
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
