# Manual de Deploy, Credenciais e Configurações - AWS EC2

Este documento reúne todas as credenciais do sistema, configurações de ambiente, chaves de API e instruções para deploy do **Chatbot Unyco** na instância AWS EC2 com IP Estático. Mantenha este arquivo seguro.

---

## 🌐 1. Arquitetura e Acesso ao Servidor

O sistema está implantado em uma máquina virtual AWS EC2 com a seguinte configuração de acesso:

* **IP Público Estático (Elastic IP):** `52.45.110.163`
* **Usuário SSH:** `ec2-user`
* **Chave Privada SSH:** `unyco-chatbot-key.pem` (salva na pasta `c:\Chatbot\bkpaws\ambiente\`)
* **Comando de Conexão SSH:**
  ```bash
  ssh -i unyco-chatbot-key.pem ec2-user@52.45.110.163
  ```

### ⚓ Links do Sistema em Produção:
* **Painel do Chatbot (WhatsApp / QR Code):** [http://52.45.110.163:3001](http://52.45.110.163:3001)
* **Gerenciar Atendentes (Admin do Middleware):** [http://52.45.110.163:3001/admin.html](http://52.45.110.163:3001/admin.html)

---

## 🔑 2. Credenciais e Chaves de API

As chaves utilizadas pela aplicação estão salvas localmente e configuradas na nuvem por meio do arquivo `.env` e do arquivo `config.json`.

### 🛡️ Variáveis de Ambiente (`.env` em `bkpaws/ambiente/`)
```ini
# API Keys principais
GROQ_API_KEY=SUA_CHAVE_GROQ_AQUI
OPENAI_API_KEY=SUA_CHAVE_OPENAI_AQUI

# Armazenamento AWS S3 (Backup de conversas)
S3_BUCKET_NAME=unyco-chatbot-conversations-308436491749
S3_REGION=us-east-1

# Endereço interno do banco vetorial no Docker
CHROMA_URL=http://localhost:8000

# Porta do Servidor Express
PORT=3001
NODE_ENV=production
```

### ⚙️ Configurações Internas (`config.json` na raiz e `bkpaws/ambiente/`)
```json
{
  "groqApiKey": "SUA_CHAVE_GROQ_AQUI",
  "openaiApiKey": "SUA_CHAVE_OPENAI_AQUI",
  "adminNumber": "5554984311468",
  "pineconeApiKey": "SUA_CHAVE_PINECONE_AQUI",
  "useAI": true,
  "usePinecone": true,
  "usePineconeAssistant": true,
  "model": "gpt-4o",
  "provider": "openai"
}
```

---

## 🚀 3. Como Realizar Novos Deploys (Atualizações)

Para realizar qualquer atualização de código na máquina de produção, utilize o script automatizado `deploy-ec2.bat`:

1. No terminal do Windows, navegue para a pasta do ambiente:
   ```cmd
   cd c:\Chatbot\bkpaws\ambiente
   ```
2. Execute o script de deploy:
   ```cmd
   .\deploy-ec2.bat
   ```

### O que este script faz automaticamente?
1. Compacta os códigos atualizados (`server.js`, `public/`, `API COOBRASTUR/`, etc.) em um arquivo `deploy.tar.gz`.
2. Envia o pacote compactado via SSH/SCP para a máquina EC2 no caminho `/home/ec2-user/`.
3. Executa remotamente a extração dos arquivos, derruba os contêineres Docker antigos e inicializa a nova versão (`docker compose down && docker compose up -d --build`).

---

## 🩺 4. Comandos de Diagnóstico Úteis no Servidor EC2

Se precisar verificar a saúde do sistema diretamente na EC2, conecte-se via SSH e utilize os seguintes comandos:

* **Listar contêineres ativos:**
  ```bash
  docker ps
  ```
  *(Devem estar rodando os contêineres `chatbot-server` na porta 3001 e `chromadb` na porta 8000).*

* **Acompanhar os logs do chatbot em tempo real:**
  ```bash
  docker compose logs -f server
  ```

* **Acompanhar os logs do banco vetorial (ChromaDB):**
  ```bash
  docker compose logs -f chromadb
  ```

* **Reiniciar apenas a aplicação do chatbot:**
  ```bash
  docker compose restart server
  ```

* **Verificar uso de armazenamento na instância:**
  ```bash
  df -h
  ```

---

## 🛠️ 5. Histórico da Última Atualização Crítica (21 de Maio de 2026)

### Correção de Acesso ao Painel "Gerenciar Atendentes" (/admin.html)
* **Problema:** Ao clicar em "Gerenciar Atendentes", o painel principal do chatbot redirecionava para `/admin.html` e retornava erro `Cannot GET /admin.html`.
* **Causa:** O painel administrativo e a folha de estilos do middleware estão localizados na pasta `API COOBRASTUR/public/`, e o Express só estava configurado para servir arquivos da pasta `public` raiz. Além disso, a pasta `API COOBRASTUR` não era incluída no comando do deploy, impedindo a subida desses arquivos estáticos para a EC2.
* **Soluções Aplicadas:**
  1. Configuração do diretório `API COOBRASTUR/public` como pasta estática secundária (fallback) no `server.js`.
  2. Ajuste do comando `tar` no `deploy-ec2.bat` para empacotar e enviar o diretório `"API COOBRASTUR"` de forma contínua em cada deploy.
  3. Verificação com sucesso gerando resposta HTTP `200 OK` nas rotas `/admin.html` e `/style.css`.
