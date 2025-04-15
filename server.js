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

// LOG DE INICIALIZAÇÃO
console.log("===========================");
console.log("✅ Inicializando API Mercado Pago com Payment Brick");
console.log("🔐 MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
console.log("===========================");

// LOG GLOBAL DE TODAS AS REQUISIÇÕES
app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.url}`);
  next();
});

// ROTA DO FRONTEND PARA ENVIAR DADOS DO BRICK (onSubmit)
app.post("/process_payment", async (req, res) => {
  try {
    const body = {
      ...req.body,
      notification_url: `${MP_NOTIFICATION_URL}/webhook`,
    };

    console.log("🚀 [process_payment] Criando pagamento:", body);

    const result = await payment.create({ body });

    if (!result.id) {
      console.error("❌ [process_payment] ID de pagamento ausente na resposta:", result);
      return res.status(500).json({ erro: "Falha ao processar pagamento" });
    }

    console.log("✅ [process_payment] Pagamento criado:", result.id);
    res.status(200).json({ id: result.id });
  } catch (err) {
    console.error("❌ [process_payment] Erro:", err.message, err.cause || err);
    res.status(500).json({ erro: "Erro ao processar pagamento" });
  }
});

// WEBHOOK
app.post("/webhook", (req, res) => {
  try {
    const log = `[${new Date().toISOString()}] ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync("webhook.log", log);
    console.log("📬 [webhook] Recebido:", req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ [webhook] Erro:", err.message);
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
    console.log(`🔍 [check-payment] Pagamento ${id} -> ${result.status}`);
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ [check-payment] Erro:", err.message, err.cause || err);
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
