const fs = require('fs');
const pdfParse = require('pdf-parse');

(async () => {
  try {
    let dataBuffer = fs.readFileSync('Contrat d\'API Complet - Marketplace.pdf');
    let data = await (pdfParse.default ? pdfParse.default(dataBuffer) : pdfParse(dataBuffer));
    console.log(data.text);
  } catch (err) {
    console.error(err);
  }
})();
