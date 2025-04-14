require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors({
  origin: "https://curriculospara.vercel.app"
}));

app.use(express.json());

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const PORT = process.env.PORT || 10000;

if (!MP_ACCESS_TOKEN || !MP_NOTIFICATION_URL) {
  console.error("❌ Variáveis obrigatórias ausentes: MP_ACCESS_TOKEN ou MP_NOTIFICATION_URL");
  process.exit(1);
}

app.use((req, res, next) => {
  console.log(`📥 Requisição recebida: [${req.method}] ${req.url}`);
  next();
});

// Criar dados de pagamento para Payment Brick (Checkout Transparente)
app.post("/criar-preferencia", (req, res) => {
  try {
    const amount = 3.00; // valor fixo
    const email = "daniel_geovani@live.com"; // fixo por enquanto

    // Verificações obrigatórias
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ erro: "Email inválido para geração do pagamento" });
    }

    if (!amount || typeof amount !== "number" || amount < 1) {
      return res.status(400).json({ erro: "Valor inválido do pagamento" });
    }

    res.json({ amount, email });
  } catch (err) {
    console.error("❌ Erro ao retornar dados para o Payment Brick:", err.message);
    res.status(500).json({ erro: "Erro ao gerar dados de pagamento" });
  }
});

// Webhook
app.post("/webhook", (req, res) => {
  try {
    const log = `[${new Date().toISOString()}] ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync("webhook.log", log);
    console.log("📬 Webhook recebido:", req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
    res.sendStatus(500);
  }
});

// Verificar status do pagamento
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "id do pagamento não informado" });

  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${id}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    );

    const pago = response.data.status === "approved";
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao verificar pagamento:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao verificar pagamento" });
  }
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
  console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
  console.log("🔐 MP_WEBHOOK_SECRET:", MP_WEBHOOK_SECRET);
});
