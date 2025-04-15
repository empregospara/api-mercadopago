require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { MercadoPagoConfig, Payment } = require("mercadopago");

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

const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const payment = new Payment(mpClient);

// INICIALIZAÇÃO
console.log("===========================");
console.log("✅ Inicializando API Mercado Pago com Payment Brick");
console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
console.log("===========================");

// LOG GLOBAL
app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.url}`);
  next();
});

// PROCESSAMENTO DO PAGAMENTO (PIX) — usável via /process_payment
app.post("/criar-pagamento", async (req, res) => {
  try {
    const { email, firstName, lastName, cpf } = req.body.payer || {};
    const body = {
      transaction_amount: 2.0,
      description: "Pagamento de Currículo",
      payment_method_id: "pix",
      payer: {
        email: email || "teste@exemplo.com",
        first_name: firstName || "Usuário",
        last_name: lastName || "Empregos",
        identification: {
          type: "CPF",
          number: cpf || "12345678909",
        },
      },
      notification_url: `${MP_NOTIFICATION_URL}/webhook`,
    };

    console.log("🚀 Enviando pagamento:", body);
    const result = await payment.create({ body });

    const { id, status, point_of_interaction } = result;
    const { qr_code, qr_code_base64 } = point_of_interaction?.transaction_data || {};

    if (!qr_code) {
      console.error("❌ QR Code ausente:", result);
      return res.status(500).json({ erro: "QR Code não retornado" });
    }

    console.log("✅ Pagamento criado:", id);
    res.json({ id, status, qr_code, qr_code_base64 });
  } catch (err) {
    console.error("❌ Erro no pagamento:", err.message, err.cause || err);
    res.status(500).json({ erro: "Erro ao processar pagamento" });
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

// CONSULTA DE STATUS
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "ID do pagamento ausente" });

  try {
    const result = await payment.get({ id });
    const pago = result.status === "approved";
    console.log(`🔍 Pagamento ${id}: ${result.status}`);
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao checar status:", err.message, err.cause || err);
    res.status(500).json({ erro: "Erro ao verificar status do pagamento" });
  }
});

// ROTA FALLBACK
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// INÍCIO
app.listen(PORT, () => {
  console.log(`✅ API rodando em http://localhost:${PORT}`);
});
