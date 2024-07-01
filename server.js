const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const app = express();
const companyName = 'BILLIARD'
const companyAddress = 'Address'
const companyPhoneNumber = '97 930 24 54'
const originUrl = 'http://localhost:3000';
const port = 4000; // or any port of your choice
app.use(bodyParser.json());
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
    printer.text(companyName);
    printer.size(0.5, 0.8);
    printer.tableCustom(
      [
        { text:`${new Date(saleData.created_at * 1000).toLocaleString()}`, align:"LEFT", width:0.5 },
        { text: `№-${saleData.id}`, align:"RIGHT", width:0.5 }
      ]
    )
    printer.align('lt');
    printer.text(`Kassir: ${saleData.registrator}`)
    printer.align('ct');
    printer.size(0.5, 0.7);
    printer.text(`Jami to'lov: ${saleData.total_price}`)

    printer.drawLine()
    printer.size(0.5, 0.5);

    if (saleData.product_sells.length != 0) {
      printer.text(`BAR - ${saleData.bar}`)

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
      printer.drawLine()
    }


    if (saleData.time_intervals.length != 0) {
      printer.text(`VAQT - ${saleData.total_time_price}`)
      saleData.time_intervals.forEach((ti, index) => {
        printer.tableCustom(
          [
            { text:`${ti.created_at} dan ${ti.end_time} gacha`, align:"LEFT", width: 0.37 },
            { text:`${ti.container} chi stol,`, align:"CENTER", width: 0.38 },
            { text: `${ti.total_price} so'm`, align:"RIGHT", width:0.25 }
          ]
        )
      });
      printer.drawLine()
    }


    if (saleData.stop_time_intervals.length != 0) {
      printer.text(`PAUZALAR`)
      saleData.stop_time_intervals.forEach((sti, index) => {
        printer.tableCustom(
          [
            { text:`${sti.created_at} dan ${sti.end_time} gacha`, align:"LEFT", width: 0.37 },
          ]
        )
      });
      printer.drawLine()
    }

    if (saleData.portions.length != 0) {
      printer.text(`PARTIYALAR`)
      saleData.portions.forEach((sti, index) => {
        printer.tableCustom(
          [
            { text:`${sti.created_at} gacha | ${sti.total_price}`, align:"LEFT", width: 0.37 },
          ]
        )
      });
      printer.drawLine()
    }


    printer.drawLine();
    printer.size(0.5, 0.5);
    printer.align('RT');
    printer.text(`${saleData.comment}`);
    printer.drawLine();
    printer.align('ct');
    printer.text(companyPhoneNumber);
    printer.text(companyAddress);
    printer.text('');// Add some empty lines for spacing
    printer.text('');
    printer.text('');
    printer.text('');
    printer.text('');
    printer.cut();
    printer.close();
  })
}

app.listen(port, () => {
  console.log(`Printer service listening at http://localhost:${port}`);
});
