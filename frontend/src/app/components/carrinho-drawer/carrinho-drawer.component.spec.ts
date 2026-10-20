import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CarrinhoDrawerComponent } from './carrinho-drawer.component';

function valores(opcoes: { valor: string }[]): string[] {
  return opcoes.map((o) => o.valor);
}

describe('CarrinhoDrawerComponent - formas de pagamento por tipo de entrega', () => {
  let c: CarrinhoDrawerComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    c = TestBed.createComponent(CarrinhoDrawerComponent).componentInstance;
  });

  it('na retirada mostra apenas Pix e Dinheiro', () => {
    c.selecionarTipoEntrega('RETIRADA');

    expect(valores(c.formasPagamento())).toEqual(['DINHEIRO', 'PIX']);
    expect(valores(c.formasPagamento())).not.toContain('CARTAO');
  });

  it('na entrega mostra todas as formas', () => {
    c.selecionarTipoEntrega('ENTREGA');

    expect(valores(c.formasPagamento())).toEqual(['DINHEIRO', 'PIX', 'CARTAO']);
  });

  it('sem tipo escolhido mostra todas, para não esconder opção indevidamente', () => {
    expect(c.tipoEntrega()).toBeNull();
    expect(valores(c.formasPagamento())).toEqual(['DINHEIRO', 'PIX', 'CARTAO']);
  });

  it('mantém o cartão na entrega', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('CARTAO');

    expect(c.formaPagamento()).toBe('CARTAO');
  });

  it('não deixa cartão marcado depois de mudar para retirada', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('CARTAO');

    c.selecionarTipoEntrega('RETIRADA');

    // O cartão saiu da lista, então a seleção não pode sobrar orfã.
    expect(c.formaPagamento()).toBe('DINHEIRO');
    expect(valores(c.formasPagamento())).toContain(c.formaPagamento());
  });

  it('preserva Pix ao passar para retirada, já que continua válido', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('PIX');

    c.selecionarTipoEntrega('RETIRADA');

    expect(c.formaPagamento()).toBe('PIX');
  });

  it('volta a permitir cartão ao voltar para entrega', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('CARTAO');
    c.selecionarTipoEntrega('RETIRADA');
    c.selecionarTipoEntrega('ENTREGA');

    expect(valores(c.formasPagamento())).toContain('CARTAO');
  });
});

describe('CarrinhoDrawerComponent - mensagem de WhatsApp do pedido', () => {
  let c: CarrinhoDrawerComponent;

  // Monta o snapshot que a etapa de sucesso usa (o carrinho real é limpo)
  function gravarResumo(
    parcial: Partial<{
      codigo: string;
      cliente: string;
      itens: {
        nome: string;
        quantidade: number;
        precoUnitario: number;
        adicionais: string[];
        removidos: string[];
      }[];
      tipoEntrega: 'ENTREGA' | 'RETIRADA';
      endereco: string | null;
      taxaEntrega: number;
      formaPagamento: 'DINHEIRO' | 'PIX' | 'CARTAO';
      trocoPara: number | null;
      total: number;
    }>,
  ): void {
    c.resumoEnvio.set({
      codigo: 'PEDIDO01',
      cliente: 'João',
      itens: [
        {
          nome: 'X-Burguer',
          quantidade: 2,
          precoUnitario: 25,
          adicionais: [],
          removidos: [],
        },
      ],
      tipoEntrega: 'RETIRADA',
      endereco: null,
      taxaEntrega: 0,
      formaPagamento: 'DINHEIRO',
      trocoPara: null,
      total: 50,
      ...parcial,
    });
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    c = TestBed.createComponent(CarrinhoDrawerComponent).componentInstance;
    c.configuracoes.telefone.set('(11) 98888-7777');
    c.configuracoes.pix.set({
      tipoChave: 'CPF',
      chave: '123.456.789-00',
      titular: 'Maria da Silva',
      instituicao: 'Nubank',
      qrUrl: '/uploads/est-1/qr.png',
    });
  });

  it('sem confirmação não há link', () => {
    expect(c.linkWhatsapp()).toBeNull();
    expect(c.pixVisivel()).toBe(false);
  });

  it('monta o link wa.me com o resumo do pedido e o link de acompanhamento curto', () => {
    gravarResumo({});
    // Código exibido ao cliente (#PEDIDO01) — a URL usa ele, não o UUID
    c.pedidoSucesso.set('PEDIDO01');

    const link = c.linkWhatsapp();
    expect(link).not.toBeNull();
    expect(link).toContain('https://wa.me/5511988887777?text=');
    // Mensagem decodificada traz os dados essenciais do pedido (o Intl do
    // pt-BR usa espaço não-quebrável após R$, normalizado aqui)
    const mensagem = decodeURIComponent(link!.split('text=')[1]).replace(
      /\u00A0/g,
      ' ',
    );
    expect(mensagem).toContain('#PEDIDO01');
    // Nome do cliente logo após o número do pedido, no cabeçalho
    expect(mensagem).toContain('Pedido #PEDIDO01 — João');
    // O telefone do cliente não vai na mensagem: quem recebe é o próprio cliente
    expect(mensagem).not.toContain('Cliente:');
    expect(mensagem).not.toContain('Telefone:');
    expect(mensagem).toContain('2x X-Burguer');
    expect(mensagem).toContain('Retirada no balcão');
    expect(mensagem).toContain('Pagamento: Dinheiro');
    expect(mensagem).toContain('Total: R$');
    // Na retirada não há cobrança de taxa
    expect(mensagem).not.toContain('(Taxa');
    // O link para acompanhar o pedido vai junto na mensagem, encurtado
    // pelo código curto em vez do UUID
    expect(mensagem).toContain('Acompanhar pedido: ');
    expect(mensagem).toMatch(/\/pedido\/PEDIDO01$/);
    expect(mensagem).not.toMatch(/\/pedido\/[0-9a-f]{8}-/i);
    // Sem emoji na mensagem: alguns clientes do WhatsApp (desktop no
    // Windows) renderizam quebrados. Todo emoji é astral (surrogate pair);
    // em dash, bullet e acentos não são.
    expect(mensagem).not.toMatch(/[\uD800-\uDBFF]/);
    expect(mensagem).not.toContain('Olá');
  });

  it('na entrega informa a taxa e no dinheiro mostra o troco', () => {
    gravarResumo({
      tipoEntrega: 'ENTREGA',
      endereco: 'Rua das Flores, 123',
      taxaEntrega: 6,
      formaPagamento: 'DINHEIRO',
      trocoPara: 100,
    });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]).replace(
      /\u00A0/g,
      ' ',
    );
    expect(mensagem).toContain(
      'Entrega: Rua das Flores, 123 (Taxa R$ 6,00)',
    );
    expect(mensagem).toContain('Troco para: R$ 100,00');
  });

  it('entrega sem taxa nenhuma mostra grátis em vez de R$ 0,00', () => {
    gravarResumo({
      tipoEntrega: 'ENTREGA',
      endereco: 'Rua das Flores, 123',
      taxaEntrega: 0,
    });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).toContain('Entrega: Rua das Flores, 123 (Taxa grátis)');
  });

  it('agrupa adicionais repetidos em "Nx Nome" em vez de listar um por um', () => {
    gravarResumo({
      itens: [
        {
          nome: 'Salada123',
          quantidade: 1,
          precoUnitario: 26,
          adicionais: [
            'Queijo',
            'Queijo',
            'Queijo',
            'Queijo',
            'Bacon',
            'Bacon',
            'Bacon',
            'Bacon',
            'Bacon',
          ],
          removidos: [],
        },
      ],
      total: 26,
    });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).toContain('Adicionais: 4x Queijo, 5x Bacon');
    // A lista bruta repetida não pode aparecer
    expect(mensagem).not.toContain('Queijo, Queijo');
  });

  it('adicionais sem repetição aparecem sem a contagem', () => {
    gravarResumo({
      itens: [
        {
          nome: 'X-Burguer',
          quantidade: 1,
          precoUnitario: 30,
          adicionais: ['Bacon', 'Cheddar'],
          removidos: [],
        },
      ],
      total: 30,
    });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).toContain('1x X-Burguer');
    expect(mensagem).toContain('Adicionais: Bacon, Cheddar');
  });

  it('informa os ingredientes removidos logo abaixo do item', () => {
    gravarResumo({
      itens: [
        {
          nome: 'X-Burguer',
          quantidade: 1,
          precoUnitario: 25,
          adicionais: [],
          removidos: ['Cebola', 'Alface'],
        },
      ],
      total: 25,
    });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).toContain('Removidos: Cebola, Alface');
  });

  it('removidos repetidos também são agrupados em "Nx Nome"', () => {
    gravarResumo({
      itens: [
        {
          nome: 'X-Burguer',
          quantidade: 1,
          precoUnitario: 25,
          adicionais: ['Queijo', 'Queijo'],
          removidos: ['Cebola', 'Cebola'],
        },
      ],
      total: 27,
    });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).toContain('Adicionais: 2x Queijo');
    expect(mensagem).toContain('Removidos: 2x Cebola');
  });

  it('item sem personalização não ganha linhas extras', () => {
    gravarResumo({});

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).not.toContain('Adicionais:');
    expect(mensagem).not.toContain('Removidos:');
  });

  it('com Pix anexa os dados de pagamento ao final da mensagem', () => {
    gravarResumo({ formaPagamento: 'PIX' });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).toContain('Pague por Pix');
    expect(mensagem).toContain('Chave: 123.456.789-00');
    expect(mensagem).toContain('Titular: Maria da Silva');
    expect(mensagem).toContain('Instituição: Nubank');
    // O tipo da chave não vai na mensagem (só interessa ao cliente o valor)
    expect(mensagem).not.toContain('Tipo da chave');
    expect(c.pixVisivel()).toBe(true);
  });

  it('Pix sem chave cadastrada não gera bloco de pagamento nem QR', () => {
    c.configuracoes.pix.set({
      tipoChave: null,
      chave: null,
      titular: null,
      instituicao: null,
      qrUrl: null,
    });
    gravarResumo({ formaPagamento: 'PIX' });

    const mensagem = decodeURIComponent(c.linkWhatsapp()!.split('text=')[1]);
    expect(mensagem).not.toContain('Pague por Pix');
    expect(c.pixVisivel()).toBe(false);
  });

  it('sem telefone do estabelecimento não há link (botão fica oculto)', () => {
    c.configuracoes.telefone.set(null);
    gravarResumo({});

    expect(c.linkWhatsapp()).toBeNull();
  });

  it('abre o WhatsApp automaticamente com a mensagem do pedido (envio direto)', () => {
    gravarResumo({});
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    c.abrirWhatsappAutomatico();

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(String(abrir.mock.calls[0][0])).toContain(
      'https://wa.me/5511988887777?text=',
    );
    abrir.mockRestore();
  });

  it('sem telefone não tenta abrir o WhatsApp automaticamente', () => {
    c.configuracoes.telefone.set(null);
    gravarResumo({});
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    c.abrirWhatsappAutomatico();

    expect(abrir).not.toHaveBeenCalled();
    abrir.mockRestore();
  });
});
