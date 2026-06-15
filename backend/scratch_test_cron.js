require("dotenv").config();
const { generateDailyTrips } = require("./src/jobs/dailyTrips.job.js");
generateDailyTrips().then(() => {
    console.log("Test finished.");
    process.exit(0);
}).catch(console.error);
