import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { GestureWindowComponent } from './gesture-window/gesture-window.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements AfterViewInit {
  title = 'gesture-windows-ng';
  
  constructor() {

  }

  

  ngAfterViewInit() {
    

  }

}
