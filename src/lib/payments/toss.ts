// Toss Payments integration
// Docs: https://docs.tosspayments.com/en

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";
const TOSS_API_URL = "https://api.tosspayments.com/v1";

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`;
}

export interface TossPaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerName?: string;
}

export interface TossPaymentConfirmation {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  approvedAt: string;
}

// Confirm a payment after the customer completes checkout
export async function confirmPayment(
  data: TossPaymentConfirmation
): Promise<TossPaymentResponse> {
  const res = await fetch(`${TOSS_API_URL}/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Payment confirmation failed");
  }

  return res.json();
}

// Cancel/refund a payment
export async function cancelPayment(
  paymentKey: string,
  reason: string
): Promise<TossPaymentResponse> {
  const res = await fetch(`${TOSS_API_URL}/payments/${paymentKey}/cancel`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancelReason: reason }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Payment cancellation failed");
  }

  return res.json();
}

// Look up a payment by paymentKey
export async function getPayment(
  paymentKey: string
): Promise<TossPaymentResponse> {
  const res = await fetch(`${TOSS_API_URL}/payments/${paymentKey}`, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Payment lookup failed");
  }

  return res.json();
}

// Generate a unique order ID
export function generateOrderId(projectId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `clip-${projectId.substring(0, 8)}-${timestamp}-${random}`;
}

// Calculate platform fee (10%)
export function calculateFees(amount: number) {
  const platformFee = Math.floor(amount * 0.1);
  const netPayeeAmount = amount - platformFee;
  return { platformFee, netPayeeAmount };
}
