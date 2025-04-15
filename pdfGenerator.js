// pdfGenerator.js
require("dotenv").config();
const puppeteer = require("puppeteer");

async function generatePDF() {
  try {
    const previewUrl = process.env.PREVIEW_URL || "https://curriculospara.vercel.app/preview";
    console.log("Gerando PDF para a URL:", previewUrl);

    // Se o ambiente precisar de um caminho customizado para o Chrome, você pode configurá-lo:
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    if (executablePath) {
      console.log("Usando Chrome/Chromium em:", executablePath);
    } else {
      console.log("Usando o Chromium embutido no pacote puppeteer");
    }

    // Lança o navegador headless
    const browser = await puppeteer.launch({
      executablePath, // Pode ser undefined se não estiver configurado, então usará o padrão do puppeteer
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.goto(previewUrl, { waitUntil: "networkidle0", timeout: 60000 });
    console.log("Página carregada, iniciando geração do PDF...");

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
