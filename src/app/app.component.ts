import { AfterViewInit, Component, ViewChild } from '@angular/core';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { Hand } from '@tensorflow-models/hand-pose-detection';
import { MediaPipeHandsModelConfig } from '@tensorflow-models/hand-pose-detection/dist/mediapipe/types';
import { KeyObject } from 'crypto';

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

enum HandPose {
  Unknown,
  KnobGripNeutral,
  KnobGripClockwise,
  KnobGripCounterClockwise
}

enum KnobGesture {
  None,
  TurnClockwise,
  TurnCounterClockwise
}

let start: DOMHighResTimeStamp, previousTimeStamp: DOMHighResTimeStamp;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements AfterViewInit {
  title = 'gesture-windows-ng';
  detector: any;
  renderingCtx!: CanvasRenderingContext2D;
  outputCanvas!: HTMLCanvasElement;
  videoElement!: HTMLVideoElement;
  leftHandPose = HandPose.Unknown;
  rightHandPose = HandPose.Unknown;

  constructor() {

  }

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

          this.detectGesture(result, hand.handedness);
          let isRightHand = hand.handedness === 'Right';
          let color: string;
          if (isRightHand) {
            switch (this.rightHandPose) {
              case HandPose.KnobGripClockwise:
                color = 'green';
                break;
              case HandPose.KnobGripCounterClockwise:
                color = 'yellow';
                break;
              default:
                color = 'red';
                break;
            }

          }
          else {
            switch (this.leftHandPose) {
              case HandPose.KnobGripClockwise:
                color = 'purple';
                break;
              case HandPose.KnobGripCounterClockwise:
                color = 'aqua';
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

  detectPose(keypoints: [{ x: number, y: number, score: undefined, name: string }], handedness: string): HandPose {
    // console.log(keypoints);
    let fingerMap = new Map(keypoints.map(obj => [obj.name, obj]));
    const middleFingerTip = fingerMap.get('middle_finger_tip');
    const indexFingerTip = fingerMap.get('index_finger_tip');
    const ringFingerTip = fingerMap.get('ring_finger_tip');
    const middleFingerDip = fingerMap.get('middle_finger_dip');
    const indexFingerDip = fingerMap.get('index_finger_dip');
    const ringFingerDip = fingerMap.get('ring_finger_dip');
    const isGrip = middleFingerDip!.y <= middleFingerTip!.y &&
      indexFingerDip!.y <= indexFingerDip!.y &&
      ringFingerDip!.y <= ringFingerDip!.y &&
      middleFingerTip!.y < indexFingerTip!.y &&
      middleFingerTip!.y < ringFingerTip!.y;
    let pose = HandPose.Unknown;
    if (isGrip) {
      pose = HandPose.KnobGripNeutral;
    }
    else {
      const compareFingerTip = handedness === 'Right' ? fingerMap.get('index_finger_tip') : fingerMap.get('ring_finger_tip');
      if (middleFingerTip!.y - compareFingerTip!.y > threshold) {
        pose = HandPose.KnobGripCounterClockwise;
      }
      else if (compareFingerTip!.y - middleFingerTip!.y > threshold) {
        pose = HandPose.KnobGripClockwise;
      }
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

  detectGesture(keypoints: [{ x: number, y: number, score: undefined, name: string }], handedness: string) {
    // check if we are in knob grip pose
    const isRightHand = handedness === 'Right';
    // const handPose = (isRightHand) ? this.rightHandPose : this.leftHandPose;

    if (isRightHand) {
      this.rightHandPose = this.detectPose(keypoints, handedness);
    }
    else {
      this.leftHandPose = this.detectPose(keypoints, handedness);
    }

  }

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
