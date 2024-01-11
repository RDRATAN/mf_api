const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*' })); // Enable CORS for all origins
const port = 3007;

let cachedData = null;

async function fetchDataAndCache() {
  try {
    const formData = {
      MFName: '-1'
    };

    const response = await axios.post('https://www.amfiindia.com/modules/NAVList', formData);

    // Ensure the request was successful
    if (response.status !== 200) {
      console.error('Failed to fetch data from the API');
      return;
    }

    const data = response.data;

    // Use Cheerio to parse the HTML content
    const $ = cheerio.load(data);

    // Extract data from the HTML table
    const tableData = [];
    $('#divExcel table tr').each((index, row) => {
      const rowData = $(row)
        .find('td')
        .map((i, col) => $(col).text().trim())
        .get();

      if (rowData.length > 0) {
        tableData.push({
          name: rowData[0],
          code1: rowData[1],
          code2: rowData[2],
          nav: rowData[3],
          navdate: rowData[4]
        });
      }
    });

    // Store the extracted data in the cached variable
    cachedData = tableData;

    console.log('Data fetched and cached successfully');
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Fetch data when the server starts
fetchDataAndCache();

// Schedule a task to fetch data every 30 minutes between 8:30 PM to 10:30 PM
cron.schedule('30-59/30 20-22 * * *', fetchDataAndCache);

app.get('/GetMutualFundsData', (req, res) => {
  try {
    if (!cachedData) {
      return res.status(500).send('Data not available');
    }

    // Convert the cached data to JSON
    const jsonData = JSON.stringify(cachedData);

    res.setHeader('Content-Type', 'application/json');
    res.send(jsonData);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
