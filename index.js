require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const dns = require("dns");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const lastShortUrl = new mongoose.Schema({
  short_url: { type: Number, default: 0 },
});

const Url = mongoose.model("Url", urlSchema);
const LastShortUrl = mongoose.model("LastShortUrl", lastShortUrl);

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
    const url = await Url.findOne({ short_url: Number(shorturl) });
    if (url) {
      res.redirect("https://" + url.original_url);
    }
  }
});

app.post("/api/shorturl", async (req, res) => {
  let url = req.body.url;
  console.log("url", url);
  if (!url) {
    res.json({ error: "invalid URL" });
    return;
  }

  // remove http:// or https://
  url = url.replace(/(^\w+:|^)\/\//, "");
  

  dns.lookup(url, async (err, address, family) => {
    if (err) {
      res.json({ error: "invalid URL" });
    } else {
      const urlAlreadyExists = await Url.findOne({ original_url: url }).exec();

      if (urlAlreadyExists) {
        res.json({ original_url: url, short_url: urlAlreadyExists.short_url });
      } else {
        const lastShortUrl = await LastShortUrl.findOne().exec();
        const newShortUrl = lastShortUrl.short_url + 1;
        const newUrl = new Url({ original_url: url, short_url: newShortUrl });
        const newLastShortUrl = new LastShortUrl({ short_url: newShortUrl });
        await newLastShortUrl.save();
        await newUrl.save();

        res.json({ original_url: url, short_url: newShortUrl });
      }
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
