require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const urlParser = require("url");
const app = express();
const dns = require("dns");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const Url = mongoose.model("Url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:shorturl", async (req, res) => {
  const shorturl = req.params.shorturl;
  if (!isNaN(shorturl)) {
    const url = await Url.findOne({ short_url: shorturl });
    if (url) {
      res.redirect(url.original_url);
    }
  }
});

app.post("/api/shorturl", async (req, res) => {
  const url = req.body.url;
  console.log("url", url);
  if (!url) {
    res.json({ error: "invalid URL" });
    return;
  }
  dns.lookup(urlParser.parse(url).hostname, async (err, address, family) => {
    if (err || !address) {
      res.json({ error: "invalid URL" });
    } else {
      const urlAlreadyExists = await Url.findOne({ original_url: url }).exec();

      if (urlAlreadyExists) {
        res.json({ original_url: url, short_url: urlAlreadyExists.short_url });
      } else {
        const urlCount = await Url.countDocuments();
        const newUrl = new Url({
          original_url: url,
          short_url: urlCount + 1,
        });
        await newUrl.save();

        res.json({ original_url: url, short_url: urlCount + 1 });
      }
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
