// Wrapper para que Lambda encuentre el handler
// tsx se carga via NODE_OPTIONS, así que TypeScript ya funciona en este punto
export { handler } from './lambda-handler.ts';
