require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ========== Criar preferência (Pix via Payment Brick) ==========
app.post("/criar-preferencia", async (req, res) => {
  try {
    const { payer, transaction_amount, payment_method_id } = req.body;

    if (!payer || !transaction_amount || !payment_method_id) {
      return res.status(400).json({ erro: "Parâmetros obrigatórios ausentes" });
    }

    const body = {
      items: [
        {
          title: "Currículo Empregos Pará",
          quantity: 1,
          unit_price: transaction_amount
        }
      ],
      payer,
      payment_method_id,
      purpose: "wallet_purchase",
      notification_url: `${process.env.MP_NOTIFICATION_URL}`,
      statement_descriptor: "EmpregosPará",
      auto_return: "approved"
    };

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      preferenceId: response.data.id,
      init_point: response.data.init_point
    });
  } catch (err) {
    console.error("❌ Erro ao criar preferência:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao criar preferência" });
  }
});

// ========== Webhook ==========
app.post("/webhook", (req, res) => {
  try {
    const raw = JSON.stringify(req.body);
    const log = `[${new Date().toISOString()}] ${raw}\n`;
    fs.appendFileSync("webhook.log", log);

    const signature = req.headers["x-signature"];
    if (!signature) {
      console.warn("⚠️ Webhook recebido sem assinatura");
    } else {
      console.log("📩 Assinatura recebida:", signature);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
    res.sendStatus(500);
  }
});

// ========== Verificação manual opcional ==========
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "ID do pagamento ausente" });

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
