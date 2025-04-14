require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// Criar pagamento Pix direto (Checkout Transparente)
// =========================
app.post("/criar-pagamento", async (req, res) => {
  try {
    const { email = "usuario@teste.com", nome = "Nome Teste", cpf = "12345678909" } = req.body;

    const pagamento = {
      transaction_amount: 1.0,
      payment_method_id: "pix",
      description: "Pagamento Currículo",
      payer: {
        email,
        first_name: nome,
        last_name: "Empregos",
        identification: {
          type: "CPF",
          number: cpf
        }
      },
      notification_url: `${process.env.WEBHOOK_URL}/webhook`
    };

    const response = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      pagamento,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": uuidv4()
        }
      }
    );

    const { id, point_of_interaction } = response.data;

    res.json({
      id,
      qr_code_base64: point_of_interaction.transaction_data.qr_code_base64,
      qr_code: point_of_interaction.transaction_data.qr_code
    });
  } catch (err) {
    console.error("❌ Erro ao criar pagamento Pix:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao criar pagamento Pix" });
  }
});

// =========================
// Webhook (notificação de pagamento Pix)
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
// Verificar status do pagamento
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
