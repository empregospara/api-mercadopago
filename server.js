require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Middleware de log para depuração
app.use((req, res, next) => {
  console.log(`Requisição recebida para ${req.url}`);
  next();
});

// Carregando variáveis de ambiente
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const PORT = process.env.PORT || 10000;

// Criar pagamento Pix
app.post("/criar-pagamento", async (req, res) => {
  try {
    const { email = "daniel_geovani@gmail.com", nome = "Nome Teste", cpf = "01810422230" } = req.body;

    const pagamento = {
      transaction_amount: 1.0,
      payment_method_id: "pix",
      description: "Pagamento Currículo",
      payer: {
        email,
        first_name: nome,
        last_name: "Empregos",
        identification: { type: "CPF", number: cpf }
      },
      notification_url: `${MP_NOTIFICATION_URL}/webhook`
    };

    const response = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      pagamento,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomBytes(16).toString("hex")
        }
      }
    );

    const { id, point_of_interaction } = response.data;
    const { qr_code_base64, qr_code } = point_of_interaction.transaction_data;

    res.json({ id, qr_code_base64, qr_code });
  } catch (err) {
    console.error("❌ Erro ao criar pagamento Pix:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao criar pagamento Pix" });
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

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
  console.log("MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
  console.log("MP_WEBHOOK_SECRET:", MP_WEBHOOK_SECRET);
});