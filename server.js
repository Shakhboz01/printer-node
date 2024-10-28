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


const companyName = 'BEST KLINIKA'
const companyAddress = 'IBN SINO KOCHASI, 21 DOM, 11-MANZILGOX'
const companyPhoneNumber = '+99888-455-53-33'
const companyPhoneNumber2 = '+99897-350-97-97'
const originUrl = 'http://localhost:3000';
// const originUrl = 'http://localhost:5000';
const footerText = 'SIZGA SALOMATLIK TILAYMIZ'

function formatter(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
}

app.post('/printer_queue', (req,res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const number = req.body.number;
  const printer_object_name = req.body.printer_object_name
  const comment = req.body.comment
  const doctorUserId = req.body.doctorUserId

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
    printer.style('normal');
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

  axios.post(`${originUrl}/queue_histories`, {
    queue_history: {
      comment: comment,
      user_id: doctorUserId
    }
  })
})

app.post('/print/:sale_id', async (req, response) => {
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
    printer.size(1.3, 1)
           .text(`${companyName}`)
           .text('');
    printer.size(0.5, 0.6);
    printer.tableCustom(
      [
        { text:`${new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Tashkent',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}`, align:"LEFT", width:0.5 },
        { text: `# ${saleData.id}`, align:"CENTER", width:0.5 }
      ]
    )
    printer.align('lt').text('');
    printer.text(`Bemor: ${saleData.buyer_name}`)
           .text('');

    printer.align('ct');
    printer.drawLine();
    printer.size(0.5, 0.5)
    printer.style('');
    // Add product sells to the receipt
    saleData.product_sells.forEach((product, index) => {
      const total_price = product.amount * product.sell_price;
      printer.align('LT')
             .style('b')
             .text(`${index + 1}-${product.product_name}`)
             .align('RT')
             .text(`${product.amount} * ${formatter(product.sell_price)} = ${formatter(total_price)}`)
             .style('')
             .drawLine();

    });
    printer.size(0.52, 0.6);
    printer.align('RT')
           .style('b')
    printer
      .text(`Jami: ${formatter(saleData.total_price)}`)
      .text(`${saleData.comment}`)
      .drawLine();

    printer
      .align('ct')
      .text(`MANZIL:`)
      .text('TERMIZ SHAXAR')
      .text(companyAddress)
      .text('')
      .text('')
      .text('MALUMOT UCHUN:')
      .text(companyPhoneNumber)
      .text(companyPhoneNumber2)
      .text('')
      .size(0.54, 0.5)
      .text(footerText)
      .text('')
      .text('')
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
