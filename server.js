require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;
const PORT = process.env.PORT || 10000;

if (!MP_ACCESS_TOKEN || !MP_NOTIFICATION_URL) {
  console.error("❌ MP_ACCESS_TOKEN ou MP_NOTIFICATION_URL não definidos no .env");
  process.exit(1);
}

// LOG INICIAL
console.log("===========================");
console.log("✅ Inicializando API Mercado Pago com preferenceId");
console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
console.log("===========================");

// LOG GLOBAL
app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.url}`);
  next();
});

// CRIA PREFERENCE PARA O PAYMENT BRICK (Pix)
app.post("/criar-preferencia", async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: "Geração de Currículo",
          unit_price: 2.0,
          quantity: 1,
        },
      ],
      purpose: "wallet_purchase",
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" },
          { id: "atm" },
          { id: "bank_transfer" },
        ],
      },
      back_urls: {
        success: "https://curriculospara.vercel.app/success",
        pending: "https://curriculospara.vercel.app/pending",
        failure: "https://curriculospara.vercel.app/failure",
      },
      auto_return: "approved",
      notification_url: `${MP_NOTIFICATION_URL}/webhook`,
    };

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      preference,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const preferenceId = response.data.id;
    if (!preferenceId) {
      console.error("❌ preferenceId ausente:", response.data);
      return res.status(500).json({ erro: "preferenceId ausente na resposta" });
    }

    console.log("✅ Preferência criada:", preferenceId);
    res.json({ preferenceId });
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

// CONSULTA DE STATUS POR ID
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "ID do pagamento ausente" });

  try {
    const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    const pago = response.data.status === "approved";
    console.log(`🔍 Pagamento ${id}: ${response.data.status}`);
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao verificar status:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao verificar status" });
  }
});

// FALLBACK
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`✅ API rodando em http://localhost:${PORT}`);
});
