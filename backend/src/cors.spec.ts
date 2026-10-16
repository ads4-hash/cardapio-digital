import { origensCors } from './cors';

describe('origensCors', () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.CORS_ORIGIN;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = original;
  });

  it('devolve o padrão sem CORS_ORIGIN (localhost e 127.0.0.1 em 4200/4000)', () => {
    delete process.env.CORS_ORIGIN;
    expect(origensCors()).toEqual([
      'http://localhost:4200',
      'http://localhost:4000',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:4000',
    ]);
  });

  it('usa CORS_ORIGIN, aparando espaços', () => {
    process.env.CORS_ORIGIN = ' https://a.com , https://b.com ';
    expect(origensCors()).toEqual(['https://a.com', 'https://b.com']);
  });

  it('cai no padrão quando CORS_ORIGIN está vazio', () => {
    process.env.CORS_ORIGIN = '';
    expect(origensCors()).toContain('http://localhost:4200');
  });

  it('descarta entradas vazias de vírgulas sobrando', () => {
    process.env.CORS_ORIGIN = 'https://a.com,,https://b.com,';
    expect(origensCors()).toEqual(['https://a.com', 'https://b.com']);
  });
});
