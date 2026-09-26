#!/bin/bash
# Backup diario dos bancos SQLite do seeagende + envio ao Google Drive
# Versao 2.0 - Com verificacao de erros do rclone

BACKUP_DIR=/root/backups/database
DB_DIR=/var/www/barbearia_nova/database
REMOTE=ggdrive:seeagende-backups

mkdir -p "$BACKUP_DIR"
cd "$DB_DIR" || exit 1

# 1. Backup de cada banco (metodo seguro do sqlite3)
for db in *.db; do
    sqlite3 "$db" ".backup '$BACKUP_DIR/${db%.db}_$(date +%F).db'"
done

# 2. Mantem os ultimos 7 dias localmente
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete

echo "$(date '+%F %T') - Backup local concluido: $(ls $BACKUP_DIR | wc -l) arquivos"

# 3. Enviar backups para o Google Drive (com verificacao de erro)
if rclone copy "$BACKUP_DIR" "$REMOTE" 2>&1; then
    echo "$(date '+%F %T') - Backup enviado ao Google Drive"

    # 4. Mantem 30 dias de historico no Drive
    if rclone delete "$REMOTE" --min-age 30d 2>&1; then
        echo "$(date '+%F %T') - Limpeza do Drive concluida (arquivos > 30 dias)"
    else
        echo "$(date '+%F %T') - Aviso: falha na limpeza do Drive (backup OK)"
    fi
else
    echo "$(date '+%F %T') - ERRO CRITICO: falha ao enviar ao Google Drive!" >&2
    echo "$(date '+%F %T') - Verifique o token com: rclone config reconnect ggdrive:" >&2
    exit 1
fi

echo "$(date '+%F %T') - Rotina de backup completa"
exit 0