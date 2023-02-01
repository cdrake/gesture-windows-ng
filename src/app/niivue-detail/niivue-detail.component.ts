import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GestureService, HandGesture, OneHandedGesture } from '../gesture.service';
import {Niivue} from '@niivue/niivue';

@Component({
  selector: 'app-niivue-detail',
  templateUrl: './niivue-detail.component.html',
  styleUrls: ['./niivue-detail.component.sass']
})
export class NiivueDetailComponent implements OnInit  {
  @ViewChild('gl', {read: ElementRef}) niivueWindow!: ElementRef;

  constructor(private gestureService: GestureService) {}
  niivue = new Niivue({show3Dcrosshair: true});
  clipPlaneShowing = false;

  ngOnInit() {
    this.gestureService.getGestureObservable().subscribe((data: OneHandedGesture) => {
        let defaultGesture = false;
        let gesture: OneHandedGesture = data;
        switch(gesture.gesture) {
          case HandGesture.Clip:
            this.clipPlaneShowing = !this.clipPlaneShowing;
            // this.niivueWindow.nativeElement.style.backgroundColor = 'yellow';
            let clipPlane = (this.clipPlaneShowing) ? [2, 0, 0] : [0, 270, 0];
            this.niivue.setClipPlane(clipPlane);
            
            break;
          case HandGesture.RotateZClockWise:
            // this.niivueWindow.nativeElement.style.backgroundColor = 'red';
            this.niivue.setRenderAzimuthElevation(this.niivue.scene.renderAzimuth + 5, this.niivue.scene.renderElevation);
            break;
          case HandGesture.RotateZCounterClockWise:
            // this.niivueWindow.nativeElement.style.backgroundColor = 'blue';
            this.niivue.setRenderAzimuthElevation(this.niivue.scene.renderAzimuth - 5, this.niivue.scene.renderElevation);
            break;
          default:
            // console.log('no gesture found');
            // this.niivueWindow.nativeElement.style.backgroundColor = 'black';
            defaultGesture = true;
            break;
        }
        if(!defaultGesture) {
          console.log('gesture data');
          console.log(data);
        }
    });

    const url = './assets/mni152.nii.gz';
    const volumeList = [
      {
        url,
        volume: { hdr: null, img: null },
        colorMap: 'gray',
        opacity: 1,
        visible: true,
      },
    ];
    
    this.niivue.attachTo('gl');
    this.niivue.loadVolumes(volumeList);
    this.niivue.setSliceType(this.niivue.sliceTypeRender);
}

}
