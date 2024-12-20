
const express = require("express");
require("dotenv/config");
const cors = require('cors');
const routes =  require('./routes.js')
const {errorHandler} = require("./utils");

const app = express();
app.use(express.json());

const corsOptions = {
  origin: '*',
  Credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

const PORT = process.env.PORT || 4000;

// scraper function : vj
app.use("/api", routes);
// Error handling middleware
app.use(errorHandler);

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    const host = "localhost"; 
    console.log(`Server running at http://${host}:${PORT}`);
  });
}


startServer();
