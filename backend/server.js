const app = require("./src/app.js");
const { logR2ConfigWarnings } = require("./src/config/r2.config.js");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  logR2ConfigWarnings();
});
