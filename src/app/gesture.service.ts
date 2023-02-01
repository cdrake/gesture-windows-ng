import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';


export enum HandGesture {
  None,
  SwipeLeft,
  SwipeRight,
  Zoom,
  Pinch,
  RotateXClockWise,
  RotateXCounterClockWise,
  RotateYClockWise,
  RotateYCounterClockWise,
  RotateZClockWise,
  RotateZCounterClockWise,  
  Clip
}

export type OneHandedGesture = {
  gesture: HandGesture,
  handedness: string;
}



@Injectable({
  providedIn: 'root'
})
export class GestureService {
  private gestureSubject = new Subject<OneHandedGesture>();

  constructor() { }

  getGestureObservable(): Observable<OneHandedGesture> {
    return this.gestureSubject.asObservable();
  }

  setGesture(gesture: OneHandedGesture) {
    this.gestureSubject.next(gesture);
  }
}