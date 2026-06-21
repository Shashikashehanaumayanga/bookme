const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bookRoutes = require("./routes/bookRoutes");
const userRoutes = require("./routes/userRoutes");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/books", bookRoutes); // <-- ADD THIS LINE
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("BookMe Backend Running");
});

app.get("/testdb", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});