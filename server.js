require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Validação inicial das variáveis de ambiente
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const PORT = process.env.PORT || 10000;

if (!MP_ACCESS_TOKEN || !MP_NOTIFICATION_URL) {
  console.error("❌ Variáveis obrigatórias ausentes: MP_ACCESS_TOKEN ou MP_NOTIFICATION_URL");
  process.exit(1);
}

// Middleware de log para depuração
app.use((req, res, next) => {
  console.log(`📥 Requisição recebida: [${req.method}] ${req.url}`);
  next();
});

// Criar preferência para Payment Brick com Pix
app.post("/criar-preferencia", async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: "Pagamento Currículo",
          unit_price: 1.0,
          quantity: 1
        }
      ],
      purpose: "wallet_purchase",
      payment_methods: {
        default_payment_method_id: "pix",
        excluded_payment_types: [],
        installments: 1
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

    res.json({ preferenceId: response.data.id });
  } catch (err) {
    console.error("❌ Erro ao criar preferência:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao criar preferência" });
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

// Rota fallback
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Inicialização
app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
  console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
  console.log("🔐 MP_WEBHOOK_SECRET:", MP_WEBHOOK_SECRET);
});
