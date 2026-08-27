import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ClienteScreenComponent } from './screens/cliente-screen/cliente-screen.component';
import { AdminScreenComponent } from './screens/admin-screen/admin-screen.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        ClienteScreenComponent,
        AdminScreenComponent,
      ],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: '', component: ClienteScreenComponent },
          { path: 'admin', component: AdminScreenComponent },
        ]),
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the navbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });
});
