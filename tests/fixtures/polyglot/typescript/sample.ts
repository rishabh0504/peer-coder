export class PaymentService {
  charge(amount: number): number {
    return amount;
  }
}

export function createClient(): PaymentService {
  return new PaymentService();
}
