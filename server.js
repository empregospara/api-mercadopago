require("dotenv").config();
const express = require("express");
const cors = require("cors");
const generatePDF = require("./pdfGenerator"); // Ajuste o caminho conforme sua estrutura

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/gerar-pdf", async (req, res) => {
  try {
    // Gera o PDF chamando a função que utiliza Puppeteer
    const pdfBuffer = await generatePDF();

    // Define os headers para download do PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="curriculo.pdf"',
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar o PDF:", error);
    res.status(500).json({ error: "Erro ao gerar o PDF" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
