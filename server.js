// https://zadig.akeo.ie/
// comment out usb.on from node_modules/escpos-usb/index.js:52-59

const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser');
const axios = require('axios');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const usb = require('usb');

const app = express();
const port = 4000; // or any port of your choice
const corsOptions = {
  // origin:'https://abc.onrender.com',
  AccessControlAllowOrigin: '*',
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
}

app.use(cors(corsOptions))

app.use(bodyParser.json());


const companyName = 'SMS CLINIC'
const companyAddress = 'Fisdavsiy'
const companyPhoneNumber = '97 111 11 11'
const originUrl = 'https://web-production-80fc3.up.railway.app';
const footerText = 'Спасибо за покупку'

function formatter(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
}

app.post('/printer_queue', (req,res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const number = req.body.number;
  const printer_object_name = req.body.printer_object_name
  const comment = req.body.comment

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
    printer.style('bu');
    printer.size(1, 1)
           .text('Navbat raqami:')
           .text('')
    printer.size(9, 8.8)
           .text(`${number}`)
           .text('');
    printer.size(0.5, 0.8);

    printer.align('ct');
    printer.size(1.5, 1.7);
    printer
      .text(comment)
      .text('');
    printer.size(0.9, 0.9)
      .text(printer_object_name)
      .text('')
      .text('')
      .text('')
      .text('');
    printer.cut();
    printer.close();
  })

})

app.get('/print/:sale_id', async (req, response) => {
  const sale_id = req.params.sale_id;
  const url = `${originUrl}/api/v1/sales/${sale_id}`;
  try {
    // Fetch sale data from the API
    const apiResponse = await axios.get(url);
    const saleData = apiResponse.data;

    printReceipt(saleData);
    response.redirect(`${originUrl}/sales`);
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
    printer.style('bu');
    printer.size(1, 1)
           .text(`${companyName}`)
           .text('');
    printer.size(0.5, 0.8);
    printer.tableCustom(
      [
        { text:`${new Date(saleData.created_at * 1000).toLocaleString()}`, align:"LEFT", width:0.5 },
        { text: `# ${saleData.id}`, align:"RIGHT", width:0.5 }
      ]
    )
    printer.align('lt');
    printer
    .text(`Клиент: ${saleData.buyer_name}`)
    .text(`Кассир: ${saleData.registrator}`);

    printer.align('ct');
    printer.size(0.5, 0.7);
    printer.drawLine();
    printer.size(0.5, 0.5);
    // Add product sells to the receipt
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
    printer
      .text(`Итого: ${formatter(saleData.total_price)}`)
      .text(`${saleData.comment}`)
      .drawLine();

    printer
      .align('ct')
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
  })
}

app.listen(port, () => {
  console.log(`Printer service listening at http://localhost:${port}`);
});
