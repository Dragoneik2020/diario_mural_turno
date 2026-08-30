const KHIPU_BASE = "https://khipu.com";
const KHIPU_API = `${KHIPU_BASE}/api/2.0`;

export interface KhipuPayment {
  paymentId: string;
  paymentUrl: string | null;
  demo: boolean;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function khipuConfigured(): boolean {
  return Boolean(
    process.env.KHIPU_CLIENT_ID && process.env.KHIPU_CLIENT_SECRET
  );
}

// Khipu v2: el cliente se identifica con client_id/client_secret (integrador).
// Con client_credentials no se usa receiver_id: el destinatario es el propio
// integrador asociado a las credenciales.
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.KHIPU_CLIENT_ID || "",
    client_secret: process.env.KHIPU_CLIENT_SECRET || "",
  });
  const res = await fetch(`${KHIPU_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Khipu token error ${res.status}: ${text}`);
  }
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.value;
}

export interface CreatePaymentInput {
  subject: string;
  amount: number; // CLP
  transactionId: string; // id de nuestra orden
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  payerEmail?: string;
  body?: string;
}

export async function createKhipuPayment(
  input: CreatePaymentInput
): Promise<KhipuPayment> {
  if (!khipuConfigured()) {
    // Modo demo: sin credenciales no hay cobro real; se marca pagada manualmente.
    return {
      paymentId: `demo-${input.transactionId}`,
      paymentUrl: null,
      demo: true,
    };
  }

  const token = await getAccessToken();
  const expiresDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const form = new URLSearchParams({
    subject: input.subject,
    amount: input.amount.toFixed(0),
    currency: "CLP",
    transaction_id: input.transactionId,
    custom: input.transactionId,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notify_url: input.notifyUrl,
    notify_api_version: "1.3",
    expires_date: expiresDate,
    body: input.body ?? "",
    payer_email: input.payerEmail ?? "",
    responsive: "true",
  });

  const res = await fetch(`${KHIPU_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Khipu payment error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return {
    paymentId: data.payment_id,
    paymentUrl: data.payment_url || null,
    demo: false,
  };
}

// Consulta el estado de un pago con el notification_token que Khipu envía en
// el webhook (flujo v2: se verifica el pago con ese token de un solo uso).
export async function getKhipuPaymentStatus(
  paymentId: string,
  notificationToken: string
): Promise<{ status: string; amount?: number }> {
  const res = await fetch(`${KHIPU_API}/payments/${encodeURIComponent(paymentId)}`, {
    method: "POST",
    headers: {
      Authorization: notificationToken,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Khipu verify error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { status: data.status, amount: data.amount };
}