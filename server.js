const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const app = express();
const port = 4000; // or any port of your choice
app.use(bodyParser.json());
const originUrl = 'https://web-production-80fc3.up.railway.app';
function formatter(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
}

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
    response.redirect(originUrl);
  } catch (error) {
    console.error(`Error fetching sale with ID ${sale_id}:`, error);
    response.status(500).send('Error fetching sale information');
  }
});

// Function to print receipt based on sale data
function printReceipt(saleData) {
  // Create a new printer
  const networkDevice = new escpos.Network('192.168.0.98', 9100);
  const printer = new escpos.Printer(networkDevice);

  // Create a new buffer for the receipt content

  // Add sale details to the receipt
  networkDevice.open(async (error) => {
    printer.font('a');
    printer.align('ct');
    printer.style('bu');
    printer.size(1, 1);
    printer.text(`SMS CLINIC`);
    printer.size(0.5, 0.8);
    printer.tableCustom(
      [
        { text:`${new Date(saleData.created_at * 1000).toLocaleString()}`, align:"LEFT", width:0.5 },
        { text: `№-${saleData.id}`, align:"RIGHT", width:0.5 }
      ]
    )
    printer.align('lt');
    printer.text(`Bemor: ${saleData.buyer_name}`)
    printer.text(`Xodim: ${saleData.registrator}`)
    printer.align('ct');
    printer.size(0.5, 0.7);
    printer.drawLine()
    printer.size(0.5, 0.5);
    saleData.product_sells.forEach((product, index) => {
      const total_price = product.amount * product.sell_price;
      printer.tableCustom(
        [
          { text:`${index + 1}-${product.product_name}`, align:"LEFT", width: 0.37 },
          { text:`${product.amount} * ${formatter(product.sell_price)}`, align:"CENTER", width: 0.38 },
          { text: `${formatter(total_price)}`, align:"RIGHT", width:0.25 }
        ]
      )
    });
    printer.drawLine();
    printer.size(0.5, 0.5);
    printer.align('RT');
    printer.text(`Jami: ${formatter(saleData.total_price)}`);
    printer.text(`${saleData.comment}`);
    printer.drawLine();
    printer.align('ct');
    printer.text(`974455454`);
    printer.text(`Address: Andijon`);
    printer.text('');// Add some empty lines for spacing
    printer.text('');
    printer.text('');
    printer.text('');
    printer.text('');
    printer.cut();
    printer.close();
  })


  // Add product sells to the receip


}

app.listen(port, () => {
  console.log(`Printer service listening at http://localhost:${port}`);
});
