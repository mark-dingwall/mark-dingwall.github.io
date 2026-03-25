'use strict';

// global settings - mess with these to alter sketch behaviour
const FRAME_ALPHA = 5; // background applied per frame with X% alpha
let SPAWN_MIN_X = 0; // minimum x pos of drop spawn (set in setup())
let SPAWN_MAX_X = 0; // maximum x pos of drop spawn (set in setup())
const MAX_X_SPEED = 0.5; // max speed that drops can "wander" left or right
const MAX_X_ACCEL = 0.025; // max rate that drops can accelerate left or right
const MAX_Y_SPEED = 7.5; // maximum speed of drops in pixels per frame
const GRAVITY = 0.0375; // gravity that moderates acceleration of drops
const FRICTION = 0.9925; // friction multiplier that slows drops in all directions
const MIN_RAD = 3; // minimum drop radius in pixels
const MAX_RAD = 6; // maximum drop radius in pixels
const MIN_RG = 64; // minimum red & green values for drops
const MAX_RG = 255; // maximum red & green values for drops
const EXPLODE_RAD = 250; // radius of explosion that pushes drops on click
const EXPLODE_STR = 5; // strength of click explosion

const drops = [];

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('drawHere');
  colorMode(RGB, 255, 255, 255, 100);
  ellipseMode(RADIUS);
  noStroke();
  background(0);

  calcSpawnBounds();
}

function draw() {
  // draw over the image with a certain amount of alpha
  background(0, 0, 0, FRAME_ALPHA);
  drops.push(new Drop()); // add a new drop each frame

  // run all the drops! Splish Splash!
  for (let i = drops.length - 1; i >= 0; i--) {
    drops[i].run();
    // remove drops that have fallen off the screen
    if (!drops[i].isAlive()) {
      drops.splice(i, 1);
    }
  }
}

class Drop {
  constructor() {
    this.x = random(SPAWN_MIN_X, SPAWN_MAX_X); // x pos of drop
    this.y = 0; // y pos of drop
    this.rad = random(MIN_RAD, MAX_RAD); // drop radius
    this.xSpeed = 0; // drop wander speed
    this.ySpeed = 0; // drop fall speed
    this.rg = random(MIN_RG, MAX_RG); // red & green colour of drop
    this.b = 255; // blue is always max
  }

  run() {
    this.update();
    this.display();
  }

  // animate the drop
  update() {
    // apply gravity to drop
    this.ySpeed += GRAVITY;

    // make drop "wander" left & right
    const a = random(-MAX_X_ACCEL, MAX_X_ACCEL);
    this.xSpeed += a;

    // apply friction and movement
    this.xSpeed *= FRICTION;
    this.ySpeed *= FRICTION;
    this.y += this.ySpeed;
    this.x += this.xSpeed;
  }

  // draw the drop
  display() {
    fill(this.rg, this.rg, this.b, 100);
    ellipse(this.x, this.y, this.rad, this.rad);
  }

  // check if drop is still alive or not
  isAlive() {
    return this.y < windowHeight + this.rad;
  }
}

// when mouse is clicked it pushes nearby drops away
function mouseClicked() {
  for (let i = 0; i < drops.length; i++) {
    // ignore drops that aren't close enough to mouse
    const dist = sqrt(sq(drops[i].x - mouseX) + sq(drops[i].y - mouseY));
    if (dist > EXPLODE_RAD) { continue; }

    // push drops away from mouse, depending on how close they are
    const v = createVector(drops[i].x - mouseX, drops[i].y - mouseY);
    const str = EXPLODE_STR * (EXPLODE_RAD - dist) / EXPLODE_RAD;
    v.normalize();
    v.mult(str);
    drops[i].xSpeed += v.x;
    drops[i].ySpeed += v.y;
  }
}

// have drops spawn in the middle 80% of the screen
function calcSpawnBounds() {
  SPAWN_MIN_X = windowWidth / 10;
  SPAWN_MAX_X = SPAWN_MIN_X * 9;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calcSpawnBounds();
}
