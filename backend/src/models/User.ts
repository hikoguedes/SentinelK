import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'superadmin' | 'partner_manager' | 'reception';
  createdAt: Date;
  updatedAt: Date;
  verifyPassword(password: string): boolean;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['superadmin', 'partner_manager', 'reception'] 
  }
}, { timestamps: true });

// Static helper to hash passwords
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Instance method to verify password
UserSchema.methods.verifyPassword = function(password: string): boolean {
  const parts = this.passwordHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
};

export default mongoose.model<IUser>('User', UserSchema);
