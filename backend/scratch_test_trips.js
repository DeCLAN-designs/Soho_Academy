const axios = require("axios");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "super_secure_secret";
const API_URL = "http://localhost:5000/api";

const generateToken = () => {
  return jwt.sign({ sub: "4", role: "Transport Manager" }, JWT_SECRET, { expiresIn: "1h" });
};

const runTest = async () => {
  const token = generateToken();
  const client = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${token}` } });
  try {
    const res = await client.get("/trips", { params: { date: "2026-06-11", trip_type: "Morning" } });
    console.log("Trips for 2026-06-11:");
    console.log(res.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
};

runTest();
