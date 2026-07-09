# Resumo — VPS do Sistema See&Agende

Documento de referência com tudo que foi configurado na VPS (`instance-20260629-0015`, IP `163.176.218.131`), pra consultar quando precisar.

---

## 📦 O que roda na VPS

| Serviço | Como roda | Porta | Observação |
|---|---|---|---|
| Sistema See&Agende | PM2 (processo `seeagende`) | 3000 | Código em `/home/ubuntu/seeagende` |
| PostgreSQL | Docker (container `postgres`) | 127.0.0.1:5432 | Banco `seeagende`, usuário `barbearia_user` |
| Redis | Docker (container `redis`) | 127.0.0.1:6379 | Usado pela Evolution API |
| Evolution API (WhatsApp) | Docker (container `evolution-api`) | 0.0.0.0:8080 | Precisa ficar público |
| Nginx | Sistema (apt) | 80/443 | Proxy/servidor web |

---

## 🔄 Atualizar o CÓDIGO na VPS (puxar do GitHub)

Sempre que você fizer `commit` + `push` no seu PC local, rode isso na VPS:

```bash
cd /home/ubuntu/seeagende
./atualizar.sh
```

Esse script já faz:
1. `git pull origin main`
2. `npm install`
3. `pm2 restart seeagende`
4. Mostra os últimos logs

**Fluxo de trabalho combinado:** você programa e testa tudo **local** (no seu PC/Windows) → `git add` + `git commit` + `git push` → roda `./atualizar.sh` na VPS → confere os logs.

⚠️ Nunca editar o código diretamente na VPS — ela é o ambiente de produção final. Toda alteração parte do seu ambiente local.

---

## 🗄️ Sobre o banco de dados

- O sistema já tem **migração automática de schema**: toda vez que reinicia (`pm2 restart`), ele mesmo verifica e cria colunas/tabelas novas que não existem ainda (usando `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), sem apagar dados.
- Ou seja, **não precisa de um script separado pra "atualizar estrutura do banco"** — isso já acontece sozinho ao rodar `./atualizar.sh`.
- Pra conferir se as migrações rodaram certo:
  ```bash
  pm2 logs seeagende --lines 50 --nostream | grep -iE "coluna|tabela|migra"
  ```

### Se um dia precisar TRAZER os dados reais do Render pra VPS de novo (⚠️ apaga o que tiver na VPS)

Existe um script guardado (renomeado pra não rodar sem querer):
```
/home/ubuntu/seeagende/RESET_BANCO_DESTRUTIVO.sh.bak
```
Ele: exporta o banco do Render → apaga o banco da VPS → restaura os dados do Render → corrige donos das tabelas. **Usar só se tiver certeza, porque apaga dados atuais da VPS.**

Comandos manuais equivalentes, caso prefira rodar passo a passo:
```bash
# 1. Exportar do Render
docker run --rm -v $(pwd):/backup postgres:18 pg_dump "SUA_DATABASE_URL_DO_RENDER" -F c -f /backup/backup_render.dump

# 2. Apagar e recriar banco local
docker exec -it postgres psql -U postgres -c "DROP DATABASE IF EXISTS seeagende;"
docker exec -it postgres psql -U postgres -c "CREATE DATABASE seeagende;"

# 3. Restaurar
docker run --rm --network=host -e PGPASSWORD=seeagende2024 -v $(pwd):/backup postgres:18 \
  pg_restore -h localhost -p 5432 -U postgres -d seeagende /backup/backup_render.dump

# 4. Corrigir dono das tabelas (necessário pro sistema rodar migrações)
docker exec -it postgres psql -U postgres -d seeagende -c "
DO \$\$ 
DECLARE r RECORD; 
BEGIN 
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP 
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO barbearia_user'; 
  END LOOP; 
END \$\$;"

docker exec -it postgres psql -U postgres -d seeagende -c "
DO \$\$ 
DECLARE r RECORD; 
BEGIN 
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname='public' LOOP 
    EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO barbearia_user'; 
  END LOOP; 
END \$\$;"

# 5. Reiniciar
pm2 restart seeagende
```

---

## 💾 Backup automático do banco (já configurado e funcionando)

### Na VPS
- Script: `/home/ubuntu/backup_diario.sh`
- Roda **todo dia às 3h da manhã** (via `crontab`)
- Salva em: `/home/ubuntu/backups/` (formato `seeagende_AAAAMMDD_HHMMSS.dump`)
- Mantém só os últimos 30 dias (apaga automaticamente os mais antigos)
- Log de execução: `/home/ubuntu/backup.log`

Comandos úteis:
```bash
# Rodar manualmente
/home/ubuntu/backup_diario.sh

# Ver a tarefa agendada
crontab -l

# Ver backups existentes
ls -lh /home/ubuntu/backups/
```

### No seu PC Windows
- Chave SSH configurada (sem senha) entre seu PC e a VPS
- Script: `C:\Users\jonat\Documents\baixar_backup.bat`
- Tarefa agendada no **Agendador de Tarefas do Windows**: `Backup Seeagende`
- Baixa os backups pra: `C:\Users\jonat\Documents\backups_seeagende\`
- Configurado como **"Executar somente quando o usuário estiver conectado"** (por causa da conta Microsoft, não local)

Comando manual (caso queira baixar na hora, sem esperar o agendamento):
```powershell
scp ubuntu@163.176.218.131:/home/ubuntu/backups/*.dump C:\Users\jonat\Documents\backups_seeagende\
```

---

## 🔒 Segurança da VPS (o que já foi corrigido)

| Item | Antes | Depois |
|---|---|---|
| Firewall (UFW) | Desativado | **Ativo** — só libera 22 (SSH), 80, 443 |
| PostgreSQL | Exposto em `0.0.0.0:5432` (mundo todo) | Só `127.0.0.1:5432` (local) |
| Redis | Exposto em `0.0.0.0:6379`, sem senha | Só `127.0.0.1:6379` (local) |
| Evolution API | `0.0.0.0:8080` público | Mantido público (necessário pro WhatsApp) |

Comandos úteis pra verificar segurança:
```bash
# Ver status do firewall
sudo ufw status verbose

# Ver todas as portas abertas
sudo ss -tulpn

# Ver containers Docker rodando
docker ps -a
```

### ⚠️ Pendências de segurança (ainda não resolvidas, considerar depois)
- Senha do Postgres é fraca (`seeagende2024`) — trocar exigiria atualizar o `.env` também
- Confirmar se login SSH por senha está desabilitado (só por chave)
- Considerar restringir a porta 22 (SSH) só pro seu IP fixo, se tiver um

---

## 🛠️ Comandos úteis do dia a dia

```bash
# Ver status do sistema
pm2 status

# Ver logs em tempo real (Ctrl+C sai sem parar o processo)
pm2 logs seeagende

# Ver últimas N linhas sem ficar "grudado"
pm2 logs seeagende --lines 50 --nostream

# Limpar logs acumulados
pm2 flush seeagende

# Reiniciar o sistema
pm2 restart seeagende

# Ver detalhes do processo (caminho do código, versão node, etc)
pm2 show seeagende

# Conferir dados no banco
docker exec -it postgres psql -U postgres -d seeagende -c "SELECT count(*) FROM clientes;"
docker exec -it postgres psql -U postgres -d seeagende -c "SELECT count(*) FROM agendamentos;"

# Ver uso de recursos (RAM, disco)
free -h
df -h
docker stats --no-stream
```

---

## 🐛 Bug corrigido nessa sessão

- **Problema**: código usava `strftime()` (função exclusiva do SQLite) em partes que rodavam no Postgres (produção), causando erro `function strftime(unknown, date) does not exist` e quebrando contagens de "agendamentos do mês" e "faturamento do mês".
- **Correção aplicada** (no ambiente local, depois commitada e enviada via `git push`): trocado `strftime(...)` por `TO_CHAR(data, 'YYYY-MM')` / `EXTRACT(MONTH FROM data)` / `EXTRACT(YEAR FROM data)` no lado do código que roda em produção (`isProduction ? ... : ...`), mantendo a versão SQLite intacta pro ambiente local.
- **Status**: ✅ Corrigido e confirmado funcionando na VPS.

---

## 📌 Fluxo de trabalho resumido (pra guardar de cabeça)

1. Programa e testa **local** no seu PC (Windows)
2. `git add .` (conferindo antes com `git status` pra não subir lixo/senhas)
3. `git commit -m "descrição da mudança"`
4. `git push origin main`
5. Render atualiza sozinho (deploy automático)
6. Na VPS: `cd /home/ubuntu/seeagende && ./atualizar.sh`
7. Conferir logs: `pm2 logs seeagende --lines 30 --nostream`

---

*Documento gerado em 07/07/2026, resumindo a sessão de configuração e correções da VPS.*
