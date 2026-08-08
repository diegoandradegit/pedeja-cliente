import type { DataProvider } from '../contracts/index.js';
import { type ConfigSupabase, conectar } from './cliente.js';
import {
  authSupabase,
  deliverySupabase,
  menuSupabase,
  ordersSupabase,
  realtimeSupabase,
} from './repos.js';

export function criarSupabaseProvider(config: ConfigSupabase): DataProvider {
  conectar(config);
  return {
    auth: authSupabase,
    menu: menuSupabase,
    orders: ordersSupabase,
    delivery: deliverySupabase,
    realtime: realtimeSupabase,
  };
}

export type { ConfigSupabase };
export { sb } from './cliente.js';
