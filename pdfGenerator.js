// pdfGenerator.js
require("dotenv").config();
const puppeteer = require("puppeteer");

async function generatePDF() {
  try {
    // A URL de preview deve estar definida no .env como PREVIEW_URL.
    const previewUrl = process.env.PREVIEW_URL || "https://curriculospara.vercel.app/preview";
    console.log("Gerando PDF para a URL:", previewUrl);

    // Lança o navegador headless com argumentos para ambientes de produção.
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Acessa a URL de preview e aguarda que a rede esteja ociosa (útil para páginas complexas).
    await page.goto(previewUrl, { waitUntil: "networkidle0", timeout: 60000 });
    console.log("Página carregada com sucesso, iniciando geração do PDF...");

    // Configura as opções do PDF: formato A4, background ativado e margens personalizadas.
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

    // Gera o PDF e armazena o buffer.
    const pdfBuffer = await page.pdf(pdfOptions);
    console.log("PDF gerado com sucesso!");

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("Erro na função generatePDF:", error);
    throw new Error("Falha ao gerar o PDF");
  }
}

module.exports = generatePDF;
