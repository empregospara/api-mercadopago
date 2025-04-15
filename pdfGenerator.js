// pdfGenerator.js
require("dotenv").config();
const puppeteer = require("puppeteer");

async function generatePDF() {
  // Define a URL de preview do currículo; ajuste conforme sua necessidade.
  const previewUrl = process.env.PREVIEW_URL || "https://curriculospara.vercel.app/preview";

  // Inicia o navegador headless com configurações para ambientes de produção.
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Navega até a página de preview e aguarda o carregamento completo (networkidle0)
  await page.goto(previewUrl, { waitUntil: "networkidle0" });

  // Define as opções do PDF. Ajuste margens e formato conforme necessário.
  const pdfOptions = {
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      right: "10mm",
      bottom: "20mm",
      left: "10mm",
    },
  };

  // Gera o PDF como buffer
  const pdfBuffer = await page.pdf(pdfOptions);

  await browser.close();
  return pdfBuffer;
}

module.exports = generatePDF;
