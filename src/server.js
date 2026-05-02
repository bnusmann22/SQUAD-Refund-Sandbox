try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

const app = require("./app");
const SQUAD_ENV = (process.env.SQUAD_ENV || "sandbox").toLowerCase();
const SQUAD_BASE_URL =
  process.env.SQUAD_BASE_URL ||
  (SQUAD_ENV === "production"
    ? "https://api-d.squadco.com"
    : "https://sandbox-api-d.squadco.com");

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log(`Squad sandbox tester running on http://localhost:${PORT}`);
  console.log(`Squad mode: ${SQUAD_ENV} (${SQUAD_BASE_URL})`);
});
