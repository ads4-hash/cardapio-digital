import { validarAmbiente } from './ambiente';

const CHAVES = [
  'JWT_SECRET',
  'HASH_SECRET',
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'COOKIE_SAMESITE',
  'COOKIE_SECURE',
  'CONFIAR_PROXY',
  'DOCS_HABILITADOS',
  'LOG_FORMAT',
] as const;

describe('validarAmbiente', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const chave of CHAVES) original[chave] = process.env[chave];

    // Base válida: cada teste mexe só no que está exercitando.
    process.env.JWT_SECRET = 'segredo-de-teste';
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    delete process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_SECURE;
    delete process.env.CONFIAR_PROXY;
    delete process.env.DOCS_HABILITADOS;
    delete process.env.LOG_FORMAT;
  });

  afterEach(() => {
    for (const chave of CHAVES) {
      const valor = original[chave];
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    }
  });

  it('aceita a configuração padrão', () => {
    const resumo = validarAmbiente();
    expect(resumo.porta).toBe(3000);
    expect(resumo.emProducao).toBe(false);
    expect(resumo.cookieSameSite).toBe('lax');
    expect(resumo.cookieSecure).toBe(false);
    expect(resumo.confiarProxy).toBe(false);
    expect(resumo.origensCors).toContain('http://localhost:4200');
  });

  it('lança sem JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    expect(() => validarAmbiente()).toThrow(/JWT_SECRET/);
  });

  it('lança com PORT não numérica', () => {
    process.env.PORT = 'http';
    expect(() => validarAmbiente()).toThrow(/PORT/);
  });

  it('lança com COOKIE_SAMESITE fora de lax/strict/none', () => {
    process.env.COOKIE_SAMESITE = 'same-origin';
    expect(() => validarAmbiente()).toThrow(/COOKIE_SAMESITE/);
  });

  it('lança com SameSite=none sem Secure', () => {
    process.env.COOKIE_SAMESITE = 'none';
    expect(() => validarAmbiente()).toThrow(/COOKIE_SECURE/);
  });

  it('aceita SameSite=none com COOKIE_SECURE=true', () => {
    process.env.COOKIE_SAMESITE = 'none';
    process.env.COOKIE_SECURE = 'true';
    const resumo = validarAmbiente();
    expect(resumo.cookieSameSite).toBe('none');
    expect(resumo.cookieSecure).toBe(true);
  });

  it('liga o Secure por padrão em produção', () => {
    process.env.NODE_ENV = 'production';
    const resumo = validarAmbiente();
    expect(resumo.emProducao).toBe(true);
    expect(resumo.cookieSecure).toBe(true);
  });

  it('lança com booleano inválido', () => {
    process.env.CONFIAR_PROXY = 'sim';
    expect(() => validarAmbiente()).toThrow(/CONFIAR_PROXY/);
  });

  it('lança com origem sem esquema', () => {
    process.env.CORS_ORIGIN = 'localhost:4200';
    expect(() => validarAmbiente()).toThrow(/CORS_ORIGIN/);
  });

  it('recusa CORS_ORIGIN="*" (incompatível com credentials)', () => {
    process.env.CORS_ORIGIN = '*';
    expect(() => validarAmbiente()).toThrow(/CORS_ORIGIN/);
  });

  it('aceita origens customizadas válidas', () => {
    process.env.CORS_ORIGIN =
      'https://cardapio.exemplo.com, https://admin.exemplo.com';
    const resumo = validarAmbiente();
    expect(resumo.origensCors).toEqual([
      'https://cardapio.exemplo.com',
      'https://admin.exemplo.com',
    ]);
  });

  it('usa pretty por padrão fora de produção e json em produção', () => {
    expect(validarAmbiente().formatoLog).toBe('pretty');
    process.env.NODE_ENV = 'production';
    expect(validarAmbiente().formatoLog).toBe('json');
  });

  it('aceita LOG_FORMAT explícito (case-insensitive)', () => {
    process.env.LOG_FORMAT = ' JSON ';
    process.env.NODE_ENV = 'production';
    expect(validarAmbiente().formatoLog).toBe('json');
    process.env.LOG_FORMAT = 'Pretty';
    delete process.env.NODE_ENV;
    expect(validarAmbiente().formatoLog).toBe('pretty');
  });

  it('lança com LOG_FORMAT fora de json/pretty', () => {
    process.env.LOG_FORMAT = 'text';
    expect(() => validarAmbiente()).toThrow(/LOG_FORMAT/);
  });
});
