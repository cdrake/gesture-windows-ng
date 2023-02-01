import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GestureService, HandGesture, OneHandedGesture } from '../gesture.service';

@Component({
  selector: 'app-niivue-detail',
  templateUrl: './niivue-detail.component.html',
  styleUrls: ['./niivue-detail.component.sass']
})
export class NiivueDetailComponent implements OnInit  {
  @ViewChild('niivueWindow', {read: ElementRef}) niivueWindow!: ElementRef;

  constructor(private gestureService: GestureService) {}

  ngOnInit() {
    this.gestureService.getGestureObservable().subscribe((data: OneHandedGesture) => {
        let gesture: OneHandedGesture = data;
        switch(gesture.gesture) {
          case HandGesture.Clip:
            this.niivueWindow.nativeElement.style.backgroundColor = 'yellow';
            break;
          case HandGesture.RotateZClockWise:
            this.niivueWindow.nativeElement.style.backgroundColor = 'red';
            break;
          case HandGesture.RotateZCounterClockWise:
            this.niivueWindow.nativeElement.style.backgroundColor = 'blue';
            break;
          default:
            // console.log('no gesture found');
            // this.niivueWindow.nativeElement.style.backgroundColor = 'black';
            break;
        }
        console.log('gesture data');
        console.log(data);
    });
}

}
