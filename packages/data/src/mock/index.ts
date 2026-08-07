import type { DataProvider } from '../contracts/index.js';
import { authMock, deliveryMock, menuMock, ordersMock, realtimeMock } from './repos.js';

export const mockProvider: DataProvider = {
  auth: authMock,
  menu: menuMock,
  orders: ordersMock,
  delivery: deliveryMock,
  realtime: realtimeMock,
};

export { resetar as resetarMock } from './store.js';
