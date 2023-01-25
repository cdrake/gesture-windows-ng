import { AfterViewInit, Component, ViewChild } from '@angular/core';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { Keypoint } from '@tensorflow-models/hand-pose-detection';
import { MediaPipeHandsModelConfig } from '@tensorflow-models/hand-pose-detection/dist/mediapipe/types';
import { Sub } from '@tensorflow/tfjs-core';
import { Position } from 'estree';
import { Key } from 'readline';
import { Subject } from 'rxjs';

type KeyPoint = { x: number, y: number, score: undefined, name: string }



function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500;
const mobile = isMobile();
const model = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig = {
  runtime: 'mediapipe', // or 'tfjs'
  modelType: 'full',
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/'
} as MediaPipeHandsModelConfig;
const threshold = 5;

const fingerLookupIndices: { [key: string]: number[] } = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20]
};

const fingerNames = ['index', 'middle', 'ring', 'pinky'];

enum HandPose {
  Unknown,
  KnobGripNeutral,
  KnobGripClockwise,
  KnobGripCounterClockwise,
  ScissorsOpen,
  ScissorsClosed
}

enum KnobGesture {
  None,
  TurnClockwise,
  TurnCounterClockwise
}

type Hand = {pose: HandPose, angle: number, position: {x: number, y: number}}
type GestureWindow = {id: string, x: number, y: number, width: number, height: number}

let start: DOMHighResTimeStamp, previousTimeStamp: DOMHighResTimeStamp;

const dot = (a: number[], b: number[]) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
const add = (a: number[], b: number[]) => a.map((e,i) => e + b[i]);
const minus = (a: number[], b: number[]) => a.map((e,i) => e - b[i]);
const squared = (x:number) => Math.pow(x, 2);
const sum = (x:number[]) => x.reduce((a, x) => a + x, 0);
const sumOfSquares = (x: number[]) => sum(x.map(squared));
const magnitude = (a: number[]) => Math.sqrt(sumOfSquares(a));

@Component({
  selector: 'app-gesture-window',
  templateUrl: './gesture-window.component.html',
  styleUrls: ['./gesture-window.component.sass']
})
export class GestureWindowComponent implements AfterViewInit {
  detector: any;
  renderingCtx!: CanvasRenderingContext2D;
  outputCanvas!: HTMLCanvasElement;
  videoElement!: HTMLVideoElement;
  leftHandPose = HandPose.Unknown;
  rightHandPose = HandPose.Unknown;
  leftHand = new Subject<Hand>();
  rightHand = new Subject<Hand>();

  windowMap = new Map<string, GestureWindow>();

  // add window changed, pose change, position change

  
  constructor() { }

  async setupCamera(): Promise<HTMLVideoElement> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const video = this.videoElement;//document.getElementById('video') as HTMLVideoElement;
    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user',
        // Only setting the video to a specified size in order to accommodate a
        // point cloud, so on mobile devices accept the default size.
        width: mobile ? undefined : VIDEO_WIDTH,
        height: mobile ? undefined : VIDEO_HEIGHT
      },
    });
    console.log(video);
    video.srcObject = stream;

    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  }

  async loadVideo() {
    const video = await this.setupCamera();
    video.play();
    return video;
  }

  async initDetector() {

    this.detector = await handPoseDetection.createDetector(model, detectorConfig);
    const video = await this.loadVideo();
    let videoWidth = video.videoWidth;
    let videoHeight = video.videoHeight;
    this.outputCanvas.width = videoWidth;
    this.outputCanvas.height = videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;

    this.renderingCtx = this.outputCanvas.getContext('2d')!;
    this.renderingCtx.clearRect(0, 0, videoWidth, videoHeight);
    this.renderingCtx.strokeStyle = 'red';
    this.renderingCtx.fillStyle = 'red';
    // this.renderingCtx.scale(-1, 1);
    let rafID = requestAnimationFrame(this.detectHands.bind(this));
    console.log('initialized');
  }



  async detectHands(timestamp: DOMHighResTimeStamp) {
    if (start === undefined) {
      start = timestamp;
    }
    const elapsed = timestamp - start;

    if (previousTimeStamp !== timestamp) {
      this.renderingCtx.drawImage(
        this.videoElement, 0, 0, this.videoElement.width, this.videoElement.height, 0, 0, this.outputCanvas.width,
        this.outputCanvas.height);
      const hands = await this.detector.estimateHands(this.videoElement);
      if (hands.length > 0) {
        for (const hand of hands) {
          const result = hand.keypoints;
          let fingerMap = new Map((result as KeyPoint[]).map(obj  => [obj.name, obj]));
          let pose = this.detectPose(fingerMap, result.handedness);
          let angle = this.getHandAngle(fingerMap);
          let wrist = fingerMap.get('wrist');
          let position = {x: wrist!.x, y: wrist!.y}; 
          // this.detectGesture(result, hand.handedness);
          let isRightHand = hand.handedness === 'Right';
          let color: string;
          if (isRightHand) {
            this.rightHand.next({pose, angle, position});
            switch (pose) {
              case HandPose.KnobGripClockwise:
                color = 'green';
                break;
              case HandPose.KnobGripCounterClockwise:
                color = 'yellow';
                break;
              case HandPose.ScissorsOpen:
                color = 'white';
                break;
              case HandPose.ScissorsClosed:
                color = 'black';
                break;
              default:
                color = 'red';
                break;
            }

          }
          else {
            this.leftHand.next({pose, angle, position});
            switch (pose) {
              case HandPose.KnobGripClockwise:
                color = 'purple';
                break;
              case HandPose.KnobGripCounterClockwise:
                color = 'aqua';
                break;
              case HandPose.ScissorsOpen:
                color = 'white';
                break;
              case HandPose.ScissorsClosed:
                color = 'black';
                break;
              default:
                color = 'blue';
                break;
            }
          }
          this.drawKeypoints(result, color);
        }
      }
      previousTimeStamp = timestamp;
    }
    requestAnimationFrame(this.detectHands.bind(this));
  }

  drawPoint(y: number, x: number, r: number) {
    this.renderingCtx.beginPath();
    this.renderingCtx.arc(x, y, r, 0, 2 * Math.PI);
    this.renderingCtx.fill();
  }

  getAngleBetweenFingers(firstFingerName: string, secondFingerName: string, fingerMap: Map<string, KeyPoint>) {
    const firstFinger = fingerMap.get(`${firstFingerName}_finger_tip`);
    const secondFinger = fingerMap.get(`${secondFingerName}_finger_tip`);
    const wrist = fingerMap.get('wrist');

    const firstLine = minus([firstFinger!.x, firstFinger!.y], [wrist!.x, wrist!.y]);
    const secondLine = minus([secondFinger!.x, secondFinger!.y], [wrist!.x, wrist!.y]);
    const dotProduct = dot(firstLine, secondLine);
    const firstMagnitude = magnitude(firstLine);
    const secondMagnitude = magnitude(secondLine);
    return Math.acos(dotProduct / (firstMagnitude * secondMagnitude));
  }

  getHandAngle(fingerMap: Map<string, KeyPoint>): number {
    const middleFingerTip = fingerMap.get('middle_finger_mcp');
    const wrist = fingerMap.get('wrist');
    const delta = minus([middleFingerTip!.x, middleFingerTip!.y], [wrist!.x, wrist!.y]);
    const deltaLength = magnitude(delta);
    
    return Math.asin(delta[0] / deltaLength);
  }

  

  isFingerCurled(fingerMap: Map<string, KeyPoint>, name: string): boolean {
    const tip = fingerMap.get(`${name}_finger_tip`);
    const dip = fingerMap.get(`${name}_finger_dip`);
    const mcp = fingerMap.get(`${name}_finger_mcp`);
    return this.isFirstPointCloser(tip!, dip!, mcp!);
  }

  isFirstPointCloser(firstPoint: KeyPoint, secondPoint: KeyPoint, destPoint: KeyPoint ): boolean {    
    const firstPointDelta = minus([firstPoint!.x, firstPoint!.y], [destPoint!.x, destPoint!.y]);
    const firstPointDeltaLength = magnitude(firstPointDelta);
    const secondPointDelta = minus([secondPoint!.x, secondPoint!.y], [destPoint!.x, destPoint!.y]);
    const secondPointDeltaLength = magnitude(secondPointDelta);

    return firstPointDeltaLength < secondPointDeltaLength;
  }

  isFingerClosed(fingerMap: Map<string, KeyPoint>, name: string): boolean {
    const tip = fingerMap.get(`${name}_finger_tip`);
    const dip = fingerMap.get(`${name}_finger_dip`);
    const wrist = fingerMap.get('wrist');
    return this.isFirstPointCloser(tip!, dip!, wrist!);
  }

  isThumbClosed(fingerMap: Map<string, KeyPoint>) {
    const thumb_tip = fingerMap.get('thumb_tip');
    const thumb_mcp = fingerMap.get('thumb_mcp');
    console.log('thumb');
    console.log(fingerMap);
    const index_finger_cmc = fingerMap.get('index_finger_mcp');
    return this.isFirstPointCloser(thumb_tip!, thumb_mcp!, index_finger_cmc!);
  }

  isHandFacingCamera(fingerMap: Map<string, KeyPoint>, handedness: string): boolean {
    const ring_finger_mcp = fingerMap.get('ring_finger_mcp');
    const pinky_finger_mcp = fingerMap.get('pinky_finger_mcp');
    if(!ring_finger_mcp || !pinky_finger_mcp) {
      console.log('finger not seen');
      console.log(fingerMap);
      return false;
    }
    const handAngle = this.getHandAngle(fingerMap);
    const delta = minus([ring_finger_mcp.x, ring_finger_mcp.y], [pinky_finger_mcp.x, pinky_finger_mcp.y]);
    return (handedness === 'Right') ? ring_finger_mcp.x < pinky_finger_mcp.x : ring_finger_mcp.x > pinky_finger_mcp.x;
  }

  

  isGrip(fingerMap: Map<string, KeyPoint>): boolean {
    let isGrip = true;
    
    for(const fingerName of fingerNames) {      
      if(!this.isFingerCurled(fingerMap, fingerName)) {
        isGrip = false;
        break;
      }
    }

    return isGrip;
  }


  isScissors(fingerMap: Map<string, KeyPoint>): boolean {
    const isPinkyClosed = this.isFingerClosed(fingerMap, 'pinky');
    const isRingClosed = this.isFingerClosed(fingerMap, 'ring');
    const isIndexClosed = this.isFingerClosed(fingerMap, 'index');
    const isMiddleClosed = this.isFingerClosed(fingerMap, 'middle');
    const isThumbClosed = this.isThumbClosed(fingerMap);
    // console.log('closed fingers');
    // console.log(isIndexClosed);
    // console.log(isMiddleClosed);
    // console.log(isRingClosed);
    // console.log(isPinkyClosed);
    return isPinkyClosed && isRingClosed && isThumbClosed && !isIndexClosed && !isMiddleClosed;
  }

  isScissorsOpen(fingerMap: Map<string, KeyPoint>): boolean {
    const isScissors = this.isScissors(fingerMap);
    let isOpen = false;
    if(isScissors) {
      const angle = this.getAngleBetweenFingers('index', 'middle', fingerMap);
      isOpen = angle > Math.PI / 9;
    }

    return isScissors && isOpen;
  }

  detectPose(fingerMap: Map<string, KeyPoint>, handedness: string): HandPose {
    // console.log(keypoints);    
    let pose = HandPose.Unknown;
    //&& this.isHandFacingCamera(fingerMap, handedness)
    if(this.isGrip(fingerMap) ) {
      // console.log('is Grip');
      const handAngle = this.getHandAngle(fingerMap);
      // console.log('hand angle is ' + handAngle);
      if(handAngle > Math.PI / 8) {
        pose = HandPose.KnobGripCounterClockwise;
        
      }
      else if(handAngle < (-1 * Math.PI / 8)) {
        pose = HandPose.KnobGripClockwise;
      }
      else {
        pose = HandPose.KnobGripNeutral;
      }
    }
    else if(this.isScissors(fingerMap)) {
      const angle = this.getAngleBetweenFingers('index', 'middle', fingerMap);
      console.log('angle between fingers is ' + angle);
      let isOpen = angle > Math.PI / 15;
      pose = isOpen ? HandPose.ScissorsOpen : HandPose.ScissorsClosed;
    }
    return pose;
  }

  detectKnobTurn(keypoints: [{ x: number, y: number, score: undefined, name: string }], handedness: string): KnobGesture {
    let gesture = KnobGesture.None;
    let fingerMap = new Map(keypoints.map(obj => [obj.name, obj]));
    const middleFingerTip = fingerMap.get('middle_finger_tip');
    const compareFingerTip = handedness === 'Right' ? fingerMap.get('index_finger_tip') : fingerMap.get('ring_finger_tip');
    console.log('detecting knob turn');
    console.log(keypoints);
    if (middleFingerTip!.y - compareFingerTip!.y > threshold) {
      gesture = KnobGesture.TurnCounterClockwise;
    }
    else if (compareFingerTip!.y - middleFingerTip!.y > threshold) {
      gesture = KnobGesture.TurnClockwise;
    }

    return gesture;

  }

  // detectGesture(keypoints: [{ x: number, y: number, score: undefined, name: string }], handedness: string) {
  //   // check if we are in knob grip pose
  //   const isRightHand = handedness === 'Right';
  //   // const handPose = (isRightHand) ? this.rightHandPose : this.leftHandPose;

  //   if (isRightHand) {
  //     this.rightHandPose = this.detectPose(keypoints, handedness);
  //   }
  //   else {
  //     this.leftHandPose = this.detectPose(keypoints, handedness);
  //   }

  // }

  drawKeypoints(keypoints: [{ x: number, y: number, score: undefined, name: string }], color: string) {

    this.renderingCtx.strokeStyle = color;
    this.renderingCtx.fillStyle = color;

    const keypointsArray = keypoints;
    for (let i = 0; i < keypointsArray.length; i++) {
      this.drawPoint(keypointsArray[i].y, keypointsArray[i].x, 3);
    }

    const fingers = Object.keys(fingerLookupIndices);
    for (let i = 0; i < fingers.length; i++) {
      const finger = fingers[i];
      const points = fingerLookupIndices[finger].map(idx => keypoints[idx]);
      this.drawPath(points, false);
    }
  }

  drawPath(points: { x: number, y: number, score: undefined, name: string }[], closePath: boolean) {
    const region = new Path2D();
    region.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      region.lineTo(point.x, point.y);
    }

    if (closePath) {
      region.closePath();
    }
    this.renderingCtx.stroke(region);
  }


  ngAfterViewInit() {
    this.initDetector();
    this.videoElement = document.getElementById('video') as HTMLVideoElement;
    this.outputCanvas = document.getElementById('output') as HTMLCanvasElement;

  }

}
