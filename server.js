require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// Criar preferência para o Payment Brick (Pix)
// =========================
app.post("/criar-preferencia", async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: "Pagamento Currículo",
          unit_price: 0.01,
          quantity: 1
        }
      ],
      purpose: "wallet_purchase",
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        default_payment_method_id: "pix",
        installments: 1
      },
      auto_return: "approved",
      notification_url: `${process.env.WEBHOOK_URL}/webhook`
    };

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      preference,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
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

// =========================
// Webhook de notificação (Pix aprovado, etc.)
// =========================
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

// =========================
// Fallback opcional de verificação de pagamento
// =========================
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "id do pagamento não informado" });

  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const pago = response.data.status === "approved";
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao verificar pagamento:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao verificar pagamento" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
});
