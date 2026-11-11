const fs = require("fs");
const path = require("path");
require("dotenv").config();
const pool = require("../config/db.js");

const SCHEMA_FILE = path.join(__dirname, "mainschema.sql");

const splitStatements = (sql) => {
  const statements = [];
  let delimiter = ";";
  let buffer = "";

  for (const line of sql.split("\n")) {
    const delimiterMatch = line.match(/^\s*DELIMITER\s+(\S+)/i);
    if (delimiterMatch) {
      delimiter = delimiterMatch[1];
      continue;
    }
    buffer += `${line}\n`;
    if (line.trimEnd().endsWith(delimiter)) {
      const statement = buffer.trim().slice(0, -delimiter.length).trim();
      if (statement.replace(/--.*$/gm, "").trim()) statements.push(statement);
      buffer = "";
    }
  }
  return statements;
};

const run = async () => {
  const statements = splitStatements(fs.readFileSync(SCHEMA_FILE, "utf8"));
  let failed = 0;

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      const isTrigger = /^\s*(--.*\n\s*)*CREATE\s+TRIGGER/i.test(statement);
      // Shared hosts (e.g. freedb.tech) deny triggers without SUPER; they are optional.
      if (isTrigger && /SUPER privilege/i.test(err.message)) {
        console.warn(`Skipping optional trigger: ${err.message}`);
        continue;
      }
      failed += 1;
      console.error(`Failed: ${statement.split("\n")[0]} -> ${err.message}`);
    }
  }

  const [tables] = await pool.query("SHOW TABLES");
  console.log(`Schema applied. ${tables.length} tables present, ${failed} failures.`);
  await pool.end();
  if (failed) process.exit(1);
};

run().catch((err) => {
  console.error("Schema setup failed:", err);
  process.exit(1);
});
