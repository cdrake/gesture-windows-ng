import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GestureWindowComponent } from './gesture-window/gesture-window.component';
import { NiivueDetailComponent } from './niivue-detail/niivue-detail.component';

@NgModule({
  declarations: [
    AppComponent,
    GestureWindowComponent,
    NiivueDetailComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
