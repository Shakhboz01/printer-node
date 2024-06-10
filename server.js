const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const app = express();
const port = 4000; // or any port of your choice
app.use(bodyParser.json());
const originUrl = 'https://web-production-80fc3.up.railway.app';
const printer_ip_address = '192.168.123.100'
const printer_port = '9100'

app.get('/print/:sale_id', async (req, response) => {
  const sale_id = req.params.sale_id;
  const url = `${originUrl}/api/v1/sales/${sale_id}`;
  try {
    // Fetch sale data from the API
    const apiResponse = await axios.get(url);
    const saleData = apiResponse.data;

    // Print receipt
    printReceipt(saleData);

    // Send the sale data back as the response
    response.send(saleData);
  } catch (error) {
    console.error(`Error fetching sale with ID ${sale_id}:`, error);
    response.status(500).send('Error fetching sale information');
  }
});

// Function to print receipt based on sale data
function printReceipt(saleData) {
  // Create a new printer
  const printer = new escpos.Network(printer_ip_address, printer_port);

  // Create a new buffer for the receipt content
  const buffer = new escpos.Screen();

  // Add sale details to the receipt
  buffer
    .text(`Mijoz: ${saleData.buyer_name.capitalize()}`)
    .text(`Vaqt: ${new Date(saleData.created_at * 1000).toLocaleString()}`)
    .text(`ID: ${saleData.id}`)
    .text(`SMS CLINIC`)
    .text('-----------------------------------------------');

  // Add product sells to the receipt
  saleData.product_sells.forEach((product, index) => {
    const total_price = product.amount * product.sell_price;
    buffer
      .text(`${index + 1}. ${product.product_name}`)
      .text(`${product.amount} * ${product.sell_price} = ${total_price}`);
  });

  buffer
    .text('-----------------------------------------------')
    .text(`Jami: ${saleData.total_price}`)
    .text(`${saleData.comment}`)
    .text('-----------------------------------------------')
    .text(`93 414 00 30`)
    .text(`Address: Andijon shahar Shaxid tepa 1-uy`)
    .text('-----------------------------------------------')
    .text('') // Add some empty lines for spacing
    .text('')
    .text('')
    .text('')
    .text('')
    .text('')
    .text('')
    .text('')
    .text('');

  // Connect to the printer
  printer.open();

  // Send the receipt to the printer
  printer
    .send(buffer)
    .close();
}

app.listen(port, () => {
  console.log(`Printer service listening at http://localhost:${port}`);
});
