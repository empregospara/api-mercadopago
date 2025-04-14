require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto"); // Substitui o uuid

const app = express();
app.use(cors());
app.use(express.json());

// Carregando variáveis de ambiente
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;               // Ex.: APP_USR-...
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;       // Ex.: https://api-mercadopago-nqye.onrender.com
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;           // Ex.: 22e72a3dce0...
const PORT = process.env.PORT || 10000;

// =========================
// Criar pagamento Pix (Checkout Transparente)
// =========================
app.post("/criar-pagamento", async (req, res) => {
  try {
    // Recebe dados do corpo (opcional)
    const { email = "usuario@teste.com", nome = "Nome Teste", cpf = "12345678909" } = req.body;

    // Monta objeto de pagamento
    const pagamento = {
      transaction_amount: 1.0,            // Valor MÍNIMO de R$1,00 no Pix
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
      // URL que receberá notificações de status
      notification_url: `${MP_NOTIFICATION_URL}/webhook`
    };

    // Faz a requisição ao Mercado Pago
    const response = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      pagamento,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          // Gera chave de idempotência usando crypto (sem precisar do 'uuid')
          "X-Idempotency-Key": crypto.randomBytes(16).toString("hex")
        }
      }
    );

    // Extrai dados do pagamento para enviar ao frontend
    const { id, point_of_interaction } = response.data;
    const { qr_code_base64, qr_code } = point_of_interaction.transaction_data;

    res.json({
      id,
      qr_code_base64,
      qr_code
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
    // Se você quiser usar MP_WEBHOOK_SECRET para validar algo,
    // é aqui que poderia checar o header do Mercado Pago.
    // Exemplo (NÃO OFICIAL, pois o MP não envia necessariamente um hash):
    // const signature = req.headers["x-mercadopago-signature"];
    // if (signature !== MP_WEBHOOK_SECRET) {
    //   return res.sendStatus(403);
    // }

    // Salva o log do webhook localmente
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
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    );

    const pago = response.data.status === "approved";
    res.json({ paid: pago });
  } catch (err) {
    console.error("❌ Erro ao verificar pagamento:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao verificar pagamento" });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ API Mercado Pago rodando na porta ${PORT}`);
  console.log("MP_NOTIFICATION_URL:", MP_NOTIFICATION_URL);
  console.log("MP_WEBHOOK_SECRET:", MP_WEBHOOK_SECRET);
});
