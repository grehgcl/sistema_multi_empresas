// server/config/db-hybrid.js - VERSÃO ROBUSTA
const globalIsSQLite = !process.env.DATABASE_URL;

function adaptQuery(sql, isSQLite) {
    if (!isSQLite) return { sql, isSQLite: false };
    
    let adapted = sql;

    // 1. Placeholders: , ,  -> ?, ?, ?
    adapted = adapted.replace(/\$(\d+)/g, '?');

    // 2. Funções de Data PG -> SQLite
    // EXTRACT(MONTH FROM data) -> strftime('%m', data)
    adapted = adapted.replace(/EXTRACT\(MONTH\s+FROM\s+([\w\.]+)\)/gi, "strftime('%m', $1)");
    // EXTRACT(YEAR FROM data) -> strftime('%Y', data)
    adapted = adapted.replace(/EXTRACT\(YEAR\s+FROM\s+([\w\.]+)\)/gi, "strftime('%Y', $1)");
    // EXTRACT(DAY FROM data) -> strftime('%d', data)
    adapted = adapted.replace(/EXTRACT\(DAY\s+FROM\s+([\w\.]+)\)/gi, "strftime('%d', $1)");
    
    // to_char(data, 'YYYY-MM-DD') -> date(data)
    adapted = adapted.replace(/to_char\(([\w\.]+),\s*'YYYY-MM-DD'\)/gi, "date($1)");

    // 3. Booleanos
    adapted = adapted.replace(/=\s*true/gi, '= 1');
    adapted = adapted.replace(/=\s*false/gi, '= 0');

    // 4. ILIKE -> LIKE
    adapted = adapted.replace(/\bILIKE\b/gi, 'LIKE');

    // DEBUG: Descomente para ver a query convertida
    // console.log('🔄 Query Adaptada:', adapted.substring(0, 100) + '...');

    return { sql: adapted, isSQLite: true };
}

class HybridDB {
    constructor(dbInstance, forceSQLite = null) {
        this.db = dbInstance;
        // Detecta automaticamente: se NÃO tem .query, é SQLite
        this.isSQLite = forceSQLite !== null 
            ? forceSQLite 
            : (typeof dbInstance.query !== 'function');
            
        if(this.isSQLite) {
            // console.log(' HybridDB: Modo SQLite Ativado para esta instância');
        }
    }

    async all(sql, params = []) {
        const { sql: adaptedSql } = adaptQuery(sql, this.isSQLite);
        
        if (this.isSQLite) {
            return new Promise((resolve, reject) => {
                this.db.all(adaptedSql, params, (err, rows) => {
                    if (err) {
                        console.error('❌ SQLite Error (all):', err.message);
                        console.error('   SQL:', adaptedSql.substring(0, 100));
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                });
            });
        } else {
            try {
                const result = await this.db.query(adaptedSql, params);
                return result.rows || [];
            } catch (err) {
                console.error('❌ PG Error (all):', err.message);
                throw err;
            }
        }
    }

    async get(sql, params = []) {
        const { sql: adaptedSql } = adaptQuery(sql, this.isSQLite);

        if (this.isSQLite) {
            return new Promise((resolve, reject) => {
                this.db.get(adaptedSql, params, (err, row) => {
                    if (err) {
                        console.error('❌ SQLite Error (get):', err.message);
                        console.error('   SQL:', adaptedSql.substring(0, 100));
                        reject(err);
                    } else {
                        resolve(row || null);
                    }
                });
            });
        } else {
            try {
                const result = await this.db.query(adaptedSql, params);
                return result.rows?.[0] || null;
            } catch (err) {
                console.error('❌ PG Error (get):', err.message);
                throw err;
            }
        }
    }

    async run(sql, params = []) {
        const { sql: adaptedSql } = adaptQuery(sql, this.isSQLite);

        if (this.isSQLite) {
            return new Promise((resolve, reject) => {
                this.db.run(adaptedSql, params, function(err) {
                    if (err) {
                        console.error('❌ SQLite Error (run):', err.message);
                        reject(err);
                    } else {
                        resolve({ lastID: this.lastID, changes: this.changes });
                    }
                });
            });
        } else {
            try {
                return await this.db.query(adaptedSql, params);
            } catch (err) {
                console.error('❌ PG Error (run):', err.message);
                throw err;
            }
        }
    }
}

module.exports = { adaptQuery, HybridDB, isSQLite: globalIsSQLite };
