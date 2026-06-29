import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  provider: string;
  productId: string;
  qty: number;
  name: string;
  price: number;
  date: string;
  cartItemId: string;
}

export interface IClientData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

export interface IOrder extends Document {
  items: IOrderItem[];
  clientData: IClientData;
  total: number;
  status: 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'CANCELADO' | 'ERRO_EMISSAO';
  lockId?: string; // ID do Soft Lock caso aplicável
  paymentId?: string; // ID gerado pelo Mercado Pago
  qrCodePix?: string;
  qrCodePixBase64?: string;
  tickets?: any[]; // Ingressos finais retornados pela PWI
  referredBy?: string; // Token do parceiro que originou a venda via Widget
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  items: { type: Array, required: true },
  clientData: { type: Object, required: true },
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO', 'ERRO_EMISSAO'],
    default: 'AGUARDANDO_PAGAMENTO'
  },
  lockId: { type: String },
  paymentId: { type: String },
  qrCodePix: { type: String },
  qrCodePixBase64: { type: String },
  tickets: { type: Array },
  referredBy: { type: String, index: true },
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);

