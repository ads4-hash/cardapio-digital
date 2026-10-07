import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreatePedidoDto, ItemPedidoDto } from './create-pedido.dto';

// Coleta as chaves de todas as violações da árvore de erros da class-validator
// (com `each: true` a violação de um item fica um nível mais fundo).
function chaves(erro: ValidationError): string[] {
  return [
    ...Object.keys(erro.constraints ?? {}),
    ...erro.children.flatMap((filho) => chaves(filho)),
  ];
}

function montarItem(parcial: Partial<ItemPedidoDto> = {}): ItemPedidoDto {
  return plainToInstance(ItemPedidoDto, {
    produtoId: '6b56406f-e189-46fa-b081-3f69490b4bbd',
    quantidade: 1,
    removidos: [],
    adicionados: [],
    ...parcial,
  });
}

function montarPedido(itens: ItemPedidoDto[]): CreatePedidoDto {
  return plainToInstance(CreatePedidoDto, {
    slug: 'jujub',
    cliente: 'João da Silva',
    tipoEntrega: 'RETIRADA',
    telefone: '11 98888-7777',
    formaPagamento: 'DINHEIRO',
    itens,
  });
}

describe('CreatePedidoDto', () => {
  it('aceita listas de ingredientes vazias', async () => {
    const erros = await validate(montarPedido([montarItem()]));

    expect(erros).toHaveLength(0);
  });

  it('aceita listas de ingredientes preenchidas com IDs curtos', async () => {
    const item = montarItem({
      removidos: ['ing-Cebola', 'ing-Queijo'],
      adicionados: ['ing-Bacon'],
    });
    const erros = await validate(montarPedido([item]));

    expect(erros).toHaveLength(0);
  });

  it('rejeita ingrediente removido com mais de 64 caracteres', async () => {
    const item = montarItem({ removidos: ['x'.repeat(65)] });
    const erros = await validate(montarPedido([item]));

    expect(erros).toHaveLength(1);
    expect(chaves(erros[0])).toContain('maxLength');
  });

  it('rejeita ingrediente adicionado com mais de 64 caracteres', async () => {
    const item = montarItem({ adicionados: ['y'.repeat(65)] });
    const erros = await validate(montarPedido([item]));

    expect(erros).toHaveLength(1);
    expect(chaves(erros[0])).toContain('maxLength');
  });

  it('marca apenas o campo que estourou o limite', async () => {
    const item = montarItem({
      removidos: ['ok', 'z'.repeat(65)],
      adicionados: ['ok'],
    });
    const erros = await validate(montarPedido([item]));

    expect(erros).toHaveLength(1);
    // itens -> índice do item -> campos inválidos
    const campos = erros[0].children[0].children;
    expect(campos.map((campo) => campo.property)).toEqual(['removidos']);
    expect(chaves(campos[0])).toContain('maxLength');
  });

  it('aceita mais de 200 porções somadas em um mesmo item', async () => {
    const porcoes = Array.from({ length: 250 }, (_, i) => `ing-${i}`);
    const item = montarItem({ removidos: [], adicionados: porcoes });
    const erros = await validate(montarPedido([item]));

    expect(erros).toHaveLength(0);
  });

  it('rejeita mais de 1000 porções somadas em um mesmo item', async () => {
    const porcoes = Array.from({ length: 1001 }, (_, i) => `ing-${i}`);
    const item = montarItem({ removidos: [], adicionados: porcoes });
    const erros = await validate(montarPedido([item]));

    expect(erros).toHaveLength(1);
    expect(chaves(erros[0])).toContain('arrayMaxSize');
  });
});
