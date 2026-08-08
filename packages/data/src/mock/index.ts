import type { DataProvider } from '../contracts/index.js';
import { localizacaoMock } from './localizacao.js';
import { authMock, deliveryMock, menuMock, ordersMock, realtimeMock } from './repos.js';

export const mockProvider: DataProvider = {
  auth: authMock,
  menu: menuMock,
  orders: ordersMock,
  delivery: deliveryMock,
  realtime: realtimeMock,
  localizacao: localizacaoMock,
};

export { resetar as resetarMock } from './store.js';
