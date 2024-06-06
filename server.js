const express = require('express');
const bodyParser = require('body-parser');
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const app = express();
const port = 4000; // or any port of your choice

app.use(bodyParser.json());

// Change this to your printer's IP address and port

const printerOptions = {
  type: 'network',
  interface: '192.168.100.50',
  port: 9100 // Default port for most Ethernet printers
};

app.post('/print-receipt', async (req, res) => {
  console.log('Started get meee')
  const sale = req.body.sale;

  const networkDevice = new escpos.Network('192.168.1.40', 9100);
  const options = { encoding: "GB18030" }
  const printer = new escpos.Printer(networkDevice, options);

  try {
    networkDevice.open(async (error) => {
      if (error) {
        res.status(500).send('Printer connection error');
        return;
      }

      printer.align('CT');
      printer.style('B');
      printer.size(2, 2);
      printer.text(`\n${process.env.COMPANY_NAME}\n`);
      printer.style('NORMAL');
      printer.size(1, 1);
      printer.drawLine();
      printer.text(`Mijoz: ${sale.buyer.name}\n`);
      printer.text(`${new Date().toLocaleString()}\n`);
      printer.text(`ID: ${sale.id}\n`);
      printer.drawLine();

      sale.product_sells.forEach((item, index) => {
        const total_price = item.amount * item.sell_price;
        printer.text(`${index + 1}. ${item.sell_by_piece ? item.product.name : item.pack.name}\n`);
        printer.align('RT');
        printer.text(`${item.amount} * ${item.sell_price.toFixed(2)} = ${total_price.toFixed(2)}\n`);
        printer.align('LT');
      });

      printer.drawLine();
      printer.text(`Jami: ${sale.total_price.toFixed(2)}\n`);
      printer.text(`${sale.comment}\n`);
      printer.drawLine();
      printer.text(`${process.env.COMPANY_PHONE_NUMBER}\n`);
      printer.text(`Address: ${process.env.COMPANY_ADDRESS}\n`);
      printer.cut();
      printer.close();
    });

    res.status(200).send('Print job submitted');
  } catch (err) {
    res.status(500).send('Error printing receipt');
  }
});

app.listen(port, () => {
  console.log(`Printer service listening at http://localhost:${port}`);
});
