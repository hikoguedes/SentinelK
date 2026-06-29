@echo off
echo.
echo ====================================================
echo  DEPLOY MIDDLEWARE SENTINELK TO AWS EC2 (52.45.110.163)
echo ====================================================
echo.

set KEY_PATH=c:\Chatbot\bkpaws\ambiente\unyco-chatbot-key.pem
set IP=52.45.110.163
set USER=ec2-user
set REMOTE_DIR=/home/ec2-user/middleware-rm

echo [1/4] Criando pasta remota se nao existir...
ssh -i "%KEY_PATH%" -o StrictHostKeyChecking=no %USER%@%IP% "mkdir -p %REMOTE_DIR%"
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao conectar via SSH ou criar a pasta %REMOTE_DIR% no servidor EC2.
    exit /b %ERRORLEVEL%
)

echo [2/4] Criando arquivo compactado (tar.gz)...
tar.exe --exclude="backend/node_modules" --exclude="mock-park/node_modules" --exclude="*.tar.gz" -czf deploy.tar.gz backend mock-park partner sentinelk index.html login.html auth-guard.js index.css b2c.html widget.js test-widget.html docker-compose.yml logo.png
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao compactar os arquivos.
    exit /b %ERRORLEVEL%
)
echo [OK] Compactacao concluida: deploy.tar.gz

echo [3/4] Enviando pacote para o servidor EC2...
scp -i "%KEY_PATH%" -o StrictHostKeyChecking=no deploy.tar.gz %USER%@%IP%:%REMOTE_DIR%/
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao enviar o arquivo via SCP.
    del deploy.tar.gz
    exit /b %ERRORLEVEL%
)
echo [OK] Pacote enviado com sucesso.

echo [4/4] Extraindo arquivos e atualizando containers Docker no EC2...
ssh -i "%KEY_PATH%" -o StrictHostKeyChecking=no %USER%@%IP% "cd %REMOTE_DIR% && tar -xzf deploy.tar.gz && rm deploy.tar.gz && docker compose down && docker compose up -d --build"
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao extrair ou subir os containers no EC2.
    del deploy.tar.gz
    exit /b %ERRORLEVEL%
)
echo [OK] Containers docker iniciados com sucesso na AWS!

del deploy.tar.gz
echo.
echo ====================================================
echo  DEPLOY CONCLUIDO COM SUCESSO NA AWS!
echo  Acesse em:
echo  - Portal B2C: http://%IP%:8080/index.html
echo  - Restrito: http://%IP%:8080/login.html
echo ====================================================
echo.
