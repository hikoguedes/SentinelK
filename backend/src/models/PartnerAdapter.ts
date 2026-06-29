import mongoose, { Schema, Document } from 'mongoose';

export interface IPartnerAdapter extends Document {
  partnerId: string;     // Ex: "PART-WATERPARK"
  partnerName: string;   // Ex: "Parque das Águas"
  code: string;          // O código JavaScript (IIFE que retorna a classe do adaptador)
  apiDoc: string;        // A documentação bruta usada na geração
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerAdapterSchema: Schema = new Schema({
  partnerId: { type: String, required: true, unique: true, index: true },
  partnerName: { type: String, required: true },
  code: { type: String, required: true },
  apiDoc: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IPartnerAdapter>('PartnerAdapter', PartnerAdapterSchema);
