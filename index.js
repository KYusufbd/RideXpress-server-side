const express = require('express');
const app = express();
const port = 5000;

// Testing purpose:
app.get('/', (req, res) => {
    res.send('Welcome to RideXpress app!')
})

app.listen(5000, () => {
  console.log(`App is listening on port: ${port}`);
});
