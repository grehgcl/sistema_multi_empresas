// server/config/db-hybrid.js
const isSQLite = !process.env.DATABASE_URL;

/**
 * Converte uma query PostgreSQL para SQLite automaticamente
 * @param {string} sql - Query SQL (escrita preferencialmente em padrão PG)
 * @returns {{ sql: string, isSQLite: boolean }}
 */
function adaptQuery(sql) {
    if (!isSQLite) return { sql, isSQLite: false };

    let adapted = sql;

    // 1. Placeholders: $1, $2, $3 → ?, ?, ?
    adapted = adapted.replace(/\$(\d+)/g, '?');

    // 2. Funções de Data PG → SQLite
    adapted = adapted.replace(/EXTRACT\(MONTH\s+FROM\s+(\w+(?:\.\w+)?)\)/gi, "strftime('%m', $1)");
    adapted = adapted.replace(/EXTRACT\(YEAR\s+FROM\s+(\w+(?:\.\w+)?)\)/gi, "strftime('%Y', $1)");
    adapted = adapted.replace(/EXTRACT\(DAY\s+FROM\s+(\w+(?:\.\w+)?)\)/gi, "strftime('%d', $1)");
    adapted = adapted.replace(/to_char\((\w+(?:\.\w+)?),\s*'YYYY-MM-DD'\)/gi, "date($1)");

    // 3. Booleanos: true/false → 1/0 (apenas em comparações WHERE)
    adapted = adapted.replace(/=\s*true/gi, '= 1');
    adapted = adapted.replace(/=\s*false/gi, '= 0');

    // 4. ILIKE → LIKE (SQLite não tem ILIKE nativo)
    adapted = adapted.replace(/\bILIKE\b/gi, 'LIKE');

    return { sql: adapted, isSQLite: true };
}

/**
 * Wrapper universal para db.get / db.all / db.run
 * Compatível com sqlite3 (callback) e pg-promise/pool (promise)
 */
class HybridDB {
    constructor(dbInstance) {
        this.db = dbInstance;
        this.isSQLite = isSQLite;
    }

    /**
     * Executa query com retorno de múltiplas linhas
     */
    async all(sql, params = []) {
        const { sql: adaptedSql } = adaptQuery(sql);
        
        if (this.isSQLite) {
            return new Promise((resolve, reject) => {
                this.db.all(adaptedSql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } else {
            const result = await this.db.query(adaptedSql, params);
            return result.rows || [];
        }
    }

    /**
     * Executa query com retorno de única linha
     */
    async get(sql, params = []) {
        const { sql: adaptedSql } = adaptQuery(sql);

        if (this.isSQLite) {
            return new Promise((resolve, reject) => {
                this.db.get(adaptedSql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } else {
            const result = await this.db.query(adaptedSql, params);
            return result.rows?.[0] || null;
        }
    }

    /**
     * Executa INSERT/UPDATE/DELETE
     */
    async run(sql, params = []) {
        const { sql: adaptedSql } = adaptQuery(sql);

        if (this.isSQLite) {
            return new Promise((resolve, reject) => {
                this.db.run(adaptedSql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        } else {
            return await this.db.query(adaptedSql, params);
        }
    }
}

module.exports = { adaptQuery, HybridDB, isSQLite };