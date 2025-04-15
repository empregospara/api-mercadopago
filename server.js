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

// LOG INICIAL
console.log("===========================");
console.log("✅ Inicializando API Mercado Pago com Payment Brick");
console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
console.log("===========================");

// LOG GLOBAL DE TODAS AS REQUISIÇÕES
app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.url}`);
  next();
});

// ROTA DE CRIAÇÃO DE PAGAMENTO PARA O PAYMENT BRICK
app.post("/criar-pagamento", async (req, res) => {
  try {
    const { email, nome = "Usuário", cpf } = req.body;

    const body = {
      transaction_amount: 2.0,
      description: "Pagamento de Currículo",
      payment_method_id: "pix",
      payer: {
        email: email || "usuario@teste.com",
        first_name: nome,
        last_name: "Empregos",
        identification: {
          type: "CPF",
          number: cpf || "12345678909",
        },
      },
      notification_url: `${MP_NOTIFICATION_URL}/webhook`,
    };

    console.log("🚀 Enviando pagamento ao Mercado Pago:", body);

    const result = await payment.create({ body });
    const { id, point_of_interaction } = result;

    if (!point_of_interaction?.transaction_data?.qr_code) {
      console.error("❌ QR Code não encontrado na resposta:", result);
      return res.status(500).json({ erro: "QR Code não retornado" });
    }

    console.log("✅ Pagamento criado com sucesso:", id);
    res.json({
      id,
      qr_code: point_of_interaction.transaction_data.qr_code,
      qr_code_base64: point_of_interaction.transaction_data.qr_code_base64,
    });
  } catch (err) {
    console.error("❌ Erro ao criar pagamento:", err.message, err.cause || err);
    res.status(500).json({ erro: "Erro ao criar pagamento" });
  }
});

// WEBHOOK PARA RECEBER NOTIFICAÇÕES DO MERCADO PAGO
app.post("/webhook", (req, res) => {
  try {
    const log = `[${new Date().toISOString()}] ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync("webhook.log", log);
    console.log("📬 Webhook recebido:", req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao processar webhook:", err.message);
    res.sendStatus(500);
  }
});

// CONSULTA DE STATUS DE PAGAMENTO
app.post("/check-payment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: "id do pagamento não informado" });

  try {
    const result = await payment.get({ id });
    const pago = result.status === "approved";
    console.log(`🔍 Status pagamento [${id}]: ${result.status}`);
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao verificar status:", err.message, err.cause || err);
    res.status(500).json({ erro: "Erro ao verificar status do pagamento" });
  }
});

// ROTA FALLBACK
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`✅ API rodando em http://localhost:${PORT}`);
});
