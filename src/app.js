const express = require("express");
const https = require("https");
const cors = require("cors");
const path = require("path");

const SQUAD_ENV = (process.env.SQUAD_ENV || "sandbox").toLowerCase();
const SQUAD_SECRET_KEY = process.env.SQUAD_SECRET_KEY || "";
const SQUAD_BASE_URL =
  process.env.SQUAD_BASE_URL ||
  (SQUAD_ENV === "production"
    ? "https://api-d.squadco.com"
    : "https://sandbox-api-d.squadco.com");

const app = express();
app.use(cors());

// middleware
app.use(express.json());

// serve frontend
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../public")));

// API route example
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    data: {
      squadEnv: SQUAD_ENV,
      baseUrl: SQUAD_BASE_URL,
      hasSecretKey: Boolean(SQUAD_SECRET_KEY),
    },
  });
});

app.post("/api/refunds", async (req, res) => {
  const response = await squadRequest("/transaction/refund", {
    method: "POST",
    body: req.body,
  });
  res.status(response.statusCode).json(response.body);
});

app.get("/api/disputes", async (req, res) => {
  const response = await squadRequest("/dispute");
  res.status(response.statusCode).json(response.body);
});

app.get("/api/disputes/:ticketId/upload-url/:fileName", async (req, res) => {
  const ticketId = encodeURIComponent(req.params.ticketId);
  const fileName = encodeURIComponent(req.params.fileName);
  const response = await squadRequest(`/dispute/upload-url/${ticketId}/${fileName}`);
  res.status(response.statusCode).json(response.body);
});

app.post("/api/disputes/:ticketId/resolve", async (req, res) => {
  const ticketId = encodeURIComponent(req.params.ticketId);
  const response = await squadRequest(`/dispute/${ticketId}/resolve`, {
    method: "GET",
    body: req.body,
  });
  res.status(response.statusCode).json(response.body);
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: "Server error while contacting Squad.",
  });
});

function squadRequest(endpoint, options = {}) {
  if (!SQUAD_SECRET_KEY) {
    return Promise.resolve({
      statusCode: 500,
      body: {
        success: false,
        message: "SQUAD_SECRET_KEY is not configured.",
      },
    });
  }

  const body = options.body ? JSON.stringify(options.body) : undefined;
  const url = new URL(endpoint, SQUAD_BASE_URL);

  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${SQUAD_SECRET_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      (response) => {
        let rawBody = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          rawBody += chunk;
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 500,
            body: parseJson(rawBody),
          });
        });
      },
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function parseJson(rawBody) {
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return {
      success: false,
      message: "Squad returned a non-JSON response.",
      raw: rawBody,
    };
  }
}

module.exports = app;
