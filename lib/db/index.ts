/**
 * Punto de entrada de la capa de base de datos.
 * Re-exporta el cliente DynamoDB y los nombres de tabla.
 */
export { ddb, TABLE, generateId, now, queryAll } from './dynamodb'
export type { TableName } from './dynamodb'
