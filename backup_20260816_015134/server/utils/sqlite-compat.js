// server/utils/sqlite-compat.js
// Funções de compatibilidade para SQLite

function formatDate(coluna) {
    return `date(${coluna})`;
}

function formatMonthYear(coluna) {
    return `strftime('%Y-%m', ${coluna})`;
}

function coalesceSum(valor) {
    return `IFNULL(SUM(${valor}), 0)`;
}

function dateInterval(intervalo) {
    return `date('now', '-${intervalo}')`;
}

function extractMonth(coluna) {
    return `strftime('%m', ${coluna})`;
}

function extractYear(coluna) {
    return `strftime('%Y', ${coluna})`;
}

function extractDay(coluna) {
    return `strftime('%d', ${coluna})`;
}

function lower(coluna) {
    return `LOWER(${coluna})`;
}

function toChar(coluna, formato) {
    // SQLite não tem TO_CHAR, usamos strftime
    if (formato === 'YYYY-MM-DD') {
        return `date(${coluna})`;
    }
    return coluna;
}

function convertPlaceholders(sql) {
    return sql.replace(/\$\d+/g, '?');
}

module.exports = {
    formatDate,
    formatMonthYear,
    coalesceSum,
    dateInterval,
    extractMonth,
    extractYear,
    extractDay,
    lower,
    toChar,
    convertPlaceholders
};