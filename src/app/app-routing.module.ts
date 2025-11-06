import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { ChatComponent } from './chat/chat.component';

const routes: Routes = [
  { path: '', component: ChatComponent }, // 👈 default route
  { path: 'checkout', component: CheckoutComponent }, // 👈 /checkout route
  { path: '**', redirectTo: '' } // 👈 fallback: redirect unknown routes to Chat
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
