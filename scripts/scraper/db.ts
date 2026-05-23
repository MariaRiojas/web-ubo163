/**
 * Re-exporta el cliente DynamoDB y los nombres de tablas para uso en los scrapers.
 */
export { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, generateId, now } from '../../lib/db/dynamodb'
export * from '../../lib/db/schema'
