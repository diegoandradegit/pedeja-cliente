import type {
  Adicional,
  Categoria,
  ConfigFrete,
  Estabelecimento,
  FaixaHorario,
  Produto,
} from '@pedeja/domain';

/** Placeholder unico ate o upload de imagem entrar (Fase 6, Supabase Storage). */
const IMAGEM_EXEMPLO = '/produtos/exemplo.webp';

const todaSemana = (abre: string, fecha: string): FaixaHorario[] =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ diaSemana: d, abre, fecha }));

export const estabelecimentos: Estabelecimento[] = [
  {
    id: 'e1',
    nome: 'Burger do Centro',
    descricao: 'Hamburgueria artesanal',
    imagem: null,
    corPrimaria: '#C2410C',
    corSecundaria: '#1C1917',
    coordenada: { lat: -23.4205, lng: -51.9331 },
    endereco: 'Av. Brasil, 1200 - Centro',
    horarios: todaSemana('18:00', '23:30'),
    aceitaRetirada: true,
    ativo: true,
  },
  {
    id: 'e2',
    nome: 'Cantina da Nona',
    descricao: 'Massas e pizzas',
    imagem: null,
    corPrimaria: '#15803D',
    corSecundaria: '#1C1917',
    coordenada: { lat: -23.4331, lng: -51.9412 },
    endereco: 'Rua Neo Alves Martins, 340',
    horarios: todaSemana('11:00', '15:00'),
    aceitaRetirada: false,
    ativo: true,
  },
];

export const categorias: Categoria[] = [
  { id: 'c1', estabelecimentoId: 'e1', nome: 'Mais pedidos', ordem: 1 },
  { id: 'c4', estabelecimentoId: 'e1', nome: 'Pizzas', ordem: 2 },
  { id: 'c5', estabelecimentoId: 'e1', nome: 'Porções', ordem: 3 },
  { id: 'c2', estabelecimentoId: 'e1', nome: 'Bebidas', ordem: 4 },
  { id: 'c3', estabelecimentoId: 'e2', nome: 'Massas', ordem: 1 },
];

export const adicionais: Adicional[] = [
  { id: 'a1', nome: 'Bacon', preco: 500, ativo: true },
  { id: 'a2', nome: 'Cheddar extra', preco: 300, ativo: true },
  { id: 'a3', nome: 'Ovo', preco: 250, ativo: true },
  { id: 'a4', nome: 'Parmesao', preco: 400, ativo: true },
];

export const produtos: Produto[] = [
  {
    id: 'p1',
    estabelecimentoId: 'e1',
    nome: 'X-Salada',
    descricao: 'Blend 160g, queijo, alface e tomate',
    preco: 2500,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c1',
    adicionaisIds: ['a1', 'a2', 'a3'],
    ativo: true,
  },
  {
    id: 'p2',
    estabelecimentoId: 'e1',
    nome: 'X-Bacon Duplo',
    descricao: 'Dois blends 160g e bacon crocante',
    preco: 3800,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c1',
    adicionaisIds: ['a1', 'a2'],
    ativo: true,
  },
  {
    id: 'p3',
    estabelecimentoId: 'e1',
    nome: 'Refrigerante lata',
    descricao: '350ml',
    preco: 700,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c2',
    adicionaisIds: [],
    ativo: true,
  },
  {
    id: 'p5',
    estabelecimentoId: 'e1',
    nome: 'Pizza Margherita',
    descricao: 'Molho de tomate italiano, mussarela de bufala e manjericao fresco',
    preco: 4900,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c4',
    adicionaisIds: ['a4'],
    ativo: true,
  },
  {
    id: 'p6',
    estabelecimentoId: 'e1',
    nome: 'Pizza Calabresa',
    descricao: 'Calabresa fatiada, cebola roxa e azeitona preta',
    preco: 4600,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c4',
    adicionaisIds: ['a4'],
    ativo: true,
  },
  {
    id: 'p7',
    estabelecimentoId: 'e1',
    nome: 'Batata frita grande',
    descricao: 'Porcao de 400g com cheddar e bacon',
    preco: 2900,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c5',
    adicionaisIds: ['a1', 'a2'],
    ativo: true,
  },
  {
    id: 'p8',
    estabelecimentoId: 'e1',
    nome: 'Suco natural 500ml',
    descricao: 'Laranja, limao ou maracuja',
    preco: 1200,
    imagem: null,
    categoriaId: 'c2',
    adicionaisIds: [],
    ativo: true,
  },
  {
    id: 'p4',
    estabelecimentoId: 'e2',
    nome: 'Nhoque ao sugo',
    descricao: 'Porcao individual',
    preco: 3200,
    imagem: IMAGEM_EXEMPLO,
    categoriaId: 'c3',
    adicionaisIds: ['a4'],
    ativo: true,
  },
];

export const configsFrete: ConfigFrete[] = [
  {
    estabelecimentoId: 'e1',
    taxaFixa: 400,
    precoPorKm: 150,
    raioMaximoKm: 10,
    freteGratisAcimaDe: 8000,
  },
  {
    estabelecimentoId: 'e2',
    taxaFixa: 600,
    precoPorKm: 200,
    raioMaximoKm: 6,
    freteGratisAcimaDe: null,
  },
];
