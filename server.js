// https://zadig.akeo.ie/
// comment out usb.on from node_modules/escpos-usb/index.js:52-59

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const usb = require('usb');

const app = express();
const port = 4000; // or any port of your choice
app.use(bodyParser.json());

const companyName = 'PO BRATSKI'
const companyAddress = 'Rudakiy kochasi 84-uy 59 xonadon'
const companyPhoneNumber = '+998 95 091 33 34'
const originUrl = 'http://localhost:3000';
const footerText = 'Спасибо за покупку'

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

    printReceipt(saleData);
    response.redirect(`${originUrl}`);
  } catch (error) {
    console.error(`Error fetching sale with ID ${sale_id}:`, error);
    response.status(500).send('Error fetching sale information');
  }
});

// Function to print receipt based on sale data
function printReceipt(saleData) {
  const device = new escpos.USB();
  const options = { encoding: "GB18030" };
  const printer = new escpos.Printer(device, options);

  device.open(function(error) {
    if (error) {
      console.error(error);
      return;
    }
    printer.font('a');
    printer.align('ct');
    printer.style('bu'); // Apply bold and underline
    printer.size(1, 1)
           .text(`${companyName}`)
           .text('');
    printer.style('normal'); // Reset to normal style
    printer.size(0.5, 0.8);
    printer.tableCustom(
      [
        { text:`${new Date(saleData.created_at * 1000).toLocaleString()}`, align:"LEFT", width:0.5 },
        { text: `# ${saleData.id}`, align:"RIGHT", width:0.5 }
      ]
    )
    printer.tableCustom(
      [
        { text: 'Кассир:', style: 'b', align:"LEFT", width:0.5 },
        { text: `${saleData.registrator}`, align:"RIGHT", width:0.5 }
      ]
    )
    printer.style('b')
    printer.text(`${saleData.comment}`)
    printer.style('normal')


    printer.align('ct')
            .drawLine();
    printer.size(0.5, 0.7);
    printer.text('');
    printer.text('');
    printer.size(0.5, 0.5);
    // Add product sells to the receipt
    saleData.product_sells.forEach((product, index) => {
      const total_price = product.amount * product.sell_price;
      printer.align('LT')
      printer.text(product.product_name)
      printer.align('RT')
      printer.text(`${product.amount} * ${formatter(product.sell_price)} = ${formatter(total_price)}`)
      printer.align('CT')
      printer.drawLine();
    });

    printer.size(0.5, 0.5);
    printer.align('RT');
    printer.style('b'); // Apply bold and underline

    printer
      .text(`ИТОГО: ${formatter(saleData.total_price)}`);

      

    printer
      .align('ct')
      .drawLine()
      .text(companyPhoneNumber)
      .text(`Адрес: ${companyAddress}`)
      .text('')
      .text(footerText)
      .text('')
      .text('')
      .text('')
      .text('')
    printer.cut();
    printer.close();
  });
}


app.listen(port, () => {
  console.log(`Printer service listening at http://localhost:${port}`);
});
