export type * from './auth.repo.js';
export type * from './menu.repo.js';
export type * from './orders.repo.js';
export type * from './delivery.repo.js';
export type * from './realtime.repo.js';
export type * from './location.repo.js';

import type { AuthRepo } from './auth.repo.js';
import type { DeliveryRepo } from './delivery.repo.js';
import type { LocationRepo } from './location.repo.js';
import type { MenuRepo } from './menu.repo.js';
import type { OrdersRepo } from './orders.repo.js';
import type { RealtimeRepo } from './realtime.repo.js';

/** Superficie unica que a UI enxerga. Trocar mock -> supabase e trocar isto. */
export type DataProvider = {
  auth: AuthRepo;
  menu: MenuRepo;
  orders: OrdersRepo;
  delivery: DeliveryRepo;
  realtime: RealtimeRepo;
  localizacao: LocationRepo;
};
