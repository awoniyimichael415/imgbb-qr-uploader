// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const FormData = require("form-data");
const cors = require("cors");

const app = express();
app.use(cors()); // in production restrict to your store domain
app.use(bodyParser.json({ limit: "15mb" })); // QR images are tiny, 15mb is safe

const IMGBB_KEY = process.env.IMGBB_API_KEY;
if (!IMGBB_KEY) {
  console.error("Missing IMGBB_API_KEY in env");
  process.exit(1);
}

app.post("/upload-qr", async (req, res) => {
  try {
    let { base64, filename } = req.body;
    if (!base64) return res.status(400).json({ error: "Missing base64 in request body" });

    // If client sent a data URL, strip the header:
    const m = base64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    const rawBase64 = m ? m[2] : base64;
    filename = filename || `qr-${Date.now()}.png`;

    const imgbbUrl = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_KEY)}`;
    const form = new FormData();
    form.append("image", rawBase64);
    form.append("name", filename);

    const resp = await fetch(imgbbUrl, { method: "POST", body: form });
    const json = await resp.json();

    if (!json || json.success !== true) {
      console.error("ImgBB error response:", json);
      return res.status(500).json({ error: "ImgBB upload failed", details: json });
    }

    // ImgBB returns the hosted URL in json.data.display_url or json.data.url
    const imageUrl = json.data.display_url || json.data.url;
    return res.json({ url: imageUrl, data: json.data });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/", (req, res) => {
  res.send("🚀 QR Uploader is running! Use POST /upload-qr");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ImgBB uploader running on port ${PORT}`));
