const fs = require('fs');
const pdfParse = require('pdf-parse');
console.log('pdfParse', pdfParse);
console.log('module keys', Object.keys(pdfParse));
console.log('pdfParse.default', pdfParse.default);

(async () => {
  try {
    let dataBuffer = fs.readFileSync('PROJET ANNUEL.pdf');
    let data = await (pdfParse.default ? pdfParse.default(dataBuffer) : pdfParse(dataBuffer));
    console.log(data.text);
  } catch (err) {
    console.error(err);
  }
})();
