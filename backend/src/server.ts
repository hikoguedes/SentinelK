import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

import router from './routes';

const app = express();
const PORT = process.env.PORT || 3333;
const MONGO_URI = process.env.MONGO_URL || 'mongodb://admin:adminpassword@mongodb:27017/middleware_db?authSource=admin';

console.log(`[MongoDB] Tentando conectar em: ${MONGO_URI}`);

import { seedUsers } from './services/db-seeder';

// Conexão com o MongoDB (Forçando IPv4 para evitar problemas de DNS no Docker)
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, family: 4 })
  .then(async () => {
     console.log('✅ Conectado ao MongoDB (Motor Financeiro)');
     await seedUsers();
  })
  .catch((err) => {
     console.error('❌ Erro FATAL ao conectar ao MongoDB. Verifique se o container do Mongo está rodando!');
     console.error(err);
  });

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas do Middleware
app.use('/api', router);

// Rota Raiz
app.get('/', (req: Request, res: Response) => {
  res.send('<h1>🚀 SentinelK Middleware API</h1><p>O servidor está rodando perfeitamente. Acesse <a href="/api/health">/api/health</a> para ver o status.</p>');
});

// Rota de Healthcheck (Teste de Sanidade)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'online', 
    message: 'SentinelK Middleware API está operando perfeitamente.',
    timestamp: new Date().toISOString()
  });
});

// Iniciando o servidor
app.listen(PORT, () => {
  console.log(`🚀 Middleware rodando na porta ${PORT}`);
  console.log(`🔗 Healthcheck: http://localhost:${PORT}/api/health`);
});
