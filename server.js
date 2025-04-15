require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "https://curriculospara.vercel.app" }));
app.use(express.json());

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const PORT = process.env.PORT || 10000;

if (!MP_ACCESS_TOKEN || !MP_NOTIFICATION_URL) {
  console.error("❌ Variáveis obrigatórias ausentes: MP_ACCESS_TOKEN ou MP_NOTIFICATION_URL");
  process.exit(1);
}

// LOG GLOBAL
console.log("===========================");
console.log("✅ Inicializando API Mercado Pago");
console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
console.log("🔐 MP_WEBHOOK_SECRET:", MP_WEBHOOK_SECRET);
console.log("===========================");

// LOG DE TODAS AS REQUISIÇÕES
app.use((req, res, next) => {
  console.log(`📥 Requisição recebida: [${req.method}] ${req.url}`);
  next();
});

// CRIAR PREFERÊNCIA
app.post("/criar-preferencia", async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: "Pagamento Currículo",
          unit_price: 1.0,
          quantity: 1,
        }
      ],
      purpose: "wallet_purchase",
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" },
          { id: "atm" },
          { id: "bank_transfer" }
        ]
      },
      back_urls: {
        success: "https://curriculospara.vercel.app/success",
        pending: "https://curriculospara.vercel.app/pending",
        failure: "https://curriculospara.vercel.app/failure"
      },
      auto_return: "approved",
      notification_url: `${MP_NOTIFICATION_URL}/webhook`
    };

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      preference,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Preferência criada:", response.data.id);
    res.json({ preferenceId: response.data.id });
  } catch (err) {
    console.error("❌ Erro ao criar preferência:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao criar preferência" });
  }
});

// WEBHOOK
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

// CHECK STATUS
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "id do pagamento não informado" });

  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${id}`,
      {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      }
    );

    const pago = response.data.status === "approved";
    console.log(`🔍 Verificação de pagamento [${id}]: ${pago ? "APROVADO" : response.data.status}`);
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao verificar pagamento:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao verificar pagamento" });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
});
