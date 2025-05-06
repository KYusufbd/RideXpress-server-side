const express = require("express");
const app = express();
const port = 5000;

// dotenv
require("dotenv").config();

// MongoDB database
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dbPassword = process.env.PASSWORD;
const uri = `mongodb+srv://yfaka001_dev:${dbPassword}@cluster0.tiftb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Firebase admin
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
initializeApp({
  credential: applicationDefault(),
  projectId: "ridexpress-81cc1",
});

// JWT
const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;

// Middlewars
// Middleware: cors
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  }),
);
app.use(express.json()); // Request body parser middleware
// Middleware: cookie-parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Custom middlewares
// Middleware: verifyToken
const verifyToken = (req, res, next) => {
  const jwToken = req?.cookies?.token;
  if (!jwToken) {
    res.status(401).send({ message: "Unauthorized access!" });
    return;
  }
  jwt.verify(jwToken, secretKey, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "Unauthorized access!" });
      return;
    } else {
      req.user = decoded;
      next();
    }
  });
};

// // Testing purpose:
// Testing server
app.get("/", (req, res) => {
  res.send("Welcome to RideXpress app!");
});

// Testing token verification
app.get("/test", verifyToken, (req, res) => {
  console.log(req.user);
  res.send("Welcome! You are a verified user!");
});

// App is listenning on port: 5000
app.listen(5000, () => {
  console.log(`App is listening on port: ${port}`);
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Testing MongoDB connection:
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch {
    console.dir;
  }
}
run();

// Mongodb cursors
const database = client.db("ridexpress");
const userCollectiion = database.collection("users");
const carCollectiion = database.collection("cars");
const bookingCollectiion = database.collection("bookings");

// Get available cars
app.get("/cars", async (req, res) => {
  await client.connect();
  const { search, sort_by, sort_order } = req.query;
  const sort = sort_by ? { [sort_by]: sort_order === "asc" ? 1 : -1 } : {};
  const query = search
    ? {
        $or: [
          { model: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ],
      }
    : {};
  const cars = await carCollectiion
    .find(query, {
      projection: {
        model: 1,
        availability: 1,
        imageUrl: 1,
        location: 1,
        dailyRentalPrice: 1,
      },
    })
    .sort(sort)
    .toArray();
  res.send(cars);
});

// Get cars of logged in user
app.get("/my-cars", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    await client.connect();
    const { _id } = await userCollectiion.findOne(
      { email },
      { projection: { _id: 1 } },
    );
    const userId = _id.toString();
    const cars = await carCollectiion
      .find(
        { ownerId: userId },
        {
          projection: {
            model: 1,
            availability: 1,
            imageUrl: 1,
            location: 1,
            dailyRentalPrice: 1,
            dateAdded: 1,
            bookingCount: 1,
          },
        },
      )
      .toArray();
    res.send(cars);
  } catch (error) {
    console.error("Error fetching cars:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Get car details
app.get("/cars/:id", async (req, res) => {
  const carId = req.params.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await client.connect();
  const car = await carCollectiion.findOne({
    _id: ObjectId.createFromHexString(carId),
  });
  car.bookings = await bookingCollectiion
    .find(
      { carId: carId, endDate: { $gte: today.toISOString() } },
      { projection: { startDate: 1, endDate: 1, _id: 0 } },
    )
    .toArray();
  res.send(car);
});

// Add car
app.post("/cars", verifyToken, async (req, res) => {
  const { car } = req.body;
  const { email } = req.user;

  // Connect to the database
  await client.connect();
  const { _id } = await userCollectiion.findOne(
    { email },
    { projection: { _id: 1 } },
  );
  car.ownerId = _id.toString();
  const result = await carCollectiion.insertOne(car);
  if (result.acknowledged) {
    res.status(200).send({ message: "Car added successfully!" });
  } else {
    res.status(500).send({ message: "Failed to add car!" });
  }
});

// Update car
app.put("/cars/:id", verifyToken, async (req, res) => {
  const carId = req.params.id;
  const { car } = req.body;
  const { email } = req.user;
  const query = { _id: ObjectId.createFromHexString(carId) };
  const update = { $set: car };
  const Options = { upsert: true };
  await client.connect();
  const result = await carCollectiion.updateOne(query, update, Options);
  if (result.matchedCount > 0) {
    res.status(200).send({ message: "Car updated successfully!" });
  } else {
    res.status(404).send({ message: "Car not found!" });
  }
});

// Delete car
app.delete("/cars/:id", verifyToken, async (req, res) => {
  const carId = req.params.id;
  const { email } = req.user;
  await client.connect();
  const { _id } = await userCollectiion.findOne(
    { email },
    { projection: { _id: 1 } },
  );
  const userId = _id.toString();
  const result = await carCollectiion.deleteOne({
    _id: ObjectId.createFromHexString(carId),
    ownerId: userId,
  });
  if (result.deletedCount === 1) {
    res.status(200).send({ message: "Car deleted successfully!" });
  } else {
    res.status(404).send({ message: "Car not found!" });
  }
});

// Book car
app.post("/bookings", verifyToken, async (req, res) => {
  const { booking } = req.body;
  const { email } = req.user;
  await client.connect();
  const { _id } = await userCollectiion.findOne(
    { email },
    { projection: { _id: 1 } },
  );
  booking.userId = _id.toString();
  const result = await bookingCollectiion.insertOne(booking);
  if (result.acknowledged) {
    carCollectiion.updateOne(
      { _id: ObjectId.createFromHexString(booking.carId) },
      { $inc: { bookingCount: 1 } },
    );
    res.status(200).send({ message: "Booking successful!" });
  } else {
    res.status(500).send({ message: "Failed to book car!" });
  }
});

// Add user
app.post("/users", async (req, res) => {
  const { user } = req.body;
  const token = req.headers.authorization;

  await client.connect();

  getAuth()
    .verifyIdToken(token)
    .then(async (decodedToken) => {
      if (decodedToken.email === user.email) {
        const existingUser = await userCollectiion.findOne({
          email: user.email,
        });
        const jwToken = jwt.sign(user, secretKey);
        if (!existingUser) {
          userCollectiion.insertOne(user);
          res
            .cookie("token", jwToken, { httpOnly: true, secure: true })
            .send("New user added!");
        } else {
          res
            .cookie("token", jwToken, { httpOnly: true, secure: true })
            .send("User logged in!");
        }
      }
    });
});

// Log out from server
app.get("/logout", (req, res) => {
  res
    .clearCookie("token", { httpOnly: true, secure: true })
    .send({ message: "Cookie cleared!" });
});
