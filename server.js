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
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const PORT = process.env.PORT || 10000;

if (!MP_ACCESS_TOKEN || !MP_NOTIFICATION_URL) {
  console.error("❌ Variáveis obrigatórias ausentes: MP_ACCESS_TOKEN ou MP_NOTIFICATION_URL");
  process.exit(1);
}

// LOG GERAL DE INICIALIZAÇÃO
console.log("===========================");
console.log("✅ Inicializando API Mercado Pago");
console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
console.log("🔐 MP_WEBHOOK_SECRET:", MP_WEBHOOK_SECRET ? "Definido" : "Não definido");
console.log("===========================");

// LOG DE TODAS AS REQUISIÇÕES RECEBIDAS
app.use((req, res, next) => {
  console.log(`📥 Requisição recebida: [${req.method}] ${req.url}`);
  next();
});

// CRIAÇÃO DE PREFERÊNCIA PARA USO NO PAYMENT BRICK
app.post("/criar-preferencia", async (req, res) => {
  try {
    console.log("🚀 [criar-preferencia] Iniciando criação de preferência");
    const preference = {
      items: [
        {
          title: "Pagamento Currículo",
          unit_price: 2.0, // Ajustado para R$2,00 para evitar erro de valor mínimo
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

    console.log("📡 [criar-preferencia] Enviando requisição para Mercado Pago");
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
      console.error("❌ [criar-preferencia] Resposta sem preferenceId:", response.data);
      return res.status(500).json({ erro: "Resposta inválida do Mercado Pago: preferenceId ausente" });
    }

    console.log("✅ [criar-preferencia] Preferência criada:", preferenceId);
    res.json({ preferenceId });
  } catch (err) {
    console.error("❌ [criar-preferencia] Erro:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    res.status(500).json({ erro: "Erro ao criar preferência: " + (err.message || "Desconhecido") });
  }
});

// WEBHOOK PARA NOTIFICAÇÕES DE PAGAMENTO
app.post("/webhook", (req, res) => {
  try {
    console.log("📬 [webhook] Recebido:", req.body);
    const log = `[${new Date().toISOString()}] ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync("webhook.log", log);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ [webhook] Erro:", err.message);
    res.sendStatus(500);
  }
});

// CONSULTA DE STATUS DE PAGAMENTO POR ID
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    console.error("❌ [check-payment] ID não informado");
    return res.status(400).json({ erro: "id do pagamento não informado" });
  }

  try {
    console.log(`🔍 [check-payment] Verificando pagamento ID: ${id}`);
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${id}`,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      }
    );

    const pago = response.data.status === "approved";
    console.log(`✅ [check-payment] Status: ${pago ? "APROVADO" : response.data.status}`);
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ [check-payment] Erro:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    res.status(500).json({ erro: "Erro ao verificar pagamento: " + (err.message || "Desconhecido") });
  }
});

// ROTA FALLBACK
app.use((req, res) => {
  console.log("⚠️ [fallback] Rota não encontrada:", req.url);
  res.status(404).json({ error: "Rota não encontrada" });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
});