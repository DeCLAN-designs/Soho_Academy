const fs = require("fs");
const path = require("path");

const logsDirectory = path.join(__dirname, "../../logs");

fs.mkdirSync(logsDirectory, { recursive: true });

const combinedLogPath = path.join(logsDirectory, "combined.log");
const errorLogPath = path.join(logsDirectory, "error.log");

const combinedLogStream = fs.createWriteStream(combinedLogPath, {
  flags: "a",
});
const errorLogStream = fs.createWriteStream(errorLogPath, {
  flags: "a",
});

const requestLogStream = {
  write: (message) => {
    process.stdout.write(message);
    combinedLogStream.write(message);
  },
};

const requestErrorLogStream = {
  write: (message) => {
    errorLogStream.write(message);
  },
};

const writeLogLine = (stream, payload) => {
  stream.write(`${JSON.stringify(payload)}\n`);
};

const logError = (error, context = {}) => {
  writeLogLine(errorLogStream, {
    level: "error",
    timestamp: new Date().toISOString(),
    message: error?.message || "Unknown error",
    stack: error?.stack,
    ...context,
  });
};

module.exports = {
  combinedLogPath,
  combinedLogStream,
  errorLogPath,
  errorLogStream,
  logError,
  requestErrorLogStream,
  requestLogStream,
  writeLogLine,
};
