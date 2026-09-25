class VarcharLengthError extends Error {
  constructor({ table, column, length, limit }) {
    super(`${table}.${column} is ${length} characters; the database limit is ${limit}.`);
    this.name = 'VarcharLengthError';
    this.code = 'VARCHAR_LENGTH_EXCEEDED';
    this.table = table;
    this.column = column;
    this.length = length;
    this.limit = limit;
  }
}

function tableNameFor(model) {
  const table = model.getTableName();
  return typeof table === 'string' ? table : table.tableName;
}

/**
 * Validate only scalar Sequelize STRING fields before PostgreSQL writes them.
 * Values are never logged: callers receive table, field, and length only.
 */
function assertVarcharLengths(model, values) {
  const table = tableNameFor(model);
  for (const [column, value] of Object.entries(values || {})) {
    const attribute = model.rawAttributes[column];
    if (!attribute || attribute.type?.key !== 'STRING' || typeof value !== 'string') continue;

    const limit = attribute.type.options?.length || 255;
    if (value.length > limit) {
      throw new VarcharLengthError({ table, column, length: value.length, limit });
    }
  }
}

function logVarcharLengthError(error, context) {
  if (!(error instanceof VarcharLengthError)) return false;
  console.error('[storage-length-validation]', JSON.stringify({
    context,
    code: error.code,
    table: error.table,
    column: error.column,
    length: error.length,
    limit: error.limit,
  }));
  return true;
}

function storageLengthResponse(error) {
  return {
    error: `The ${error.column} value is ${error.length} characters, but ${error.table}.${error.column} currently allows ${error.limit}.`,
    code: error.code,
    details: {
      table: error.table,
      column: error.column,
      length: error.length,
      limit: error.limit,
    },
  };
}

module.exports = {
  VarcharLengthError,
  assertVarcharLengths,
  logVarcharLengthError,
  storageLengthResponse,
};
