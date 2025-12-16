import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "BigBio API running" });
});

app.listen(PORT, () => {
  console.log(`BigBio API running on port ${PORT}`);
});
