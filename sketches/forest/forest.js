'use strict';

const seeds = [];
const trees = [];
const leavesAlive = [];
const leavesDying = [];
/** @type {Array<{x: number, y: number}>} */
const groundPoints = [];
const groundY = [];
let treeColours = [[]];
let leafColours = [[]];
let clickWait = 0;
let groundBuffer;

// constants that determine the behaviour of the ground spline
const GROUND_MIN_Y_PERC = 0.45;
const GROUND_MAX_Y_PERC = 0.65;
const GROUND_X_MIN_INTERVAL = 50;
const GROUND_X_MAX_INTERVAL = 100;

// constants for the base terrain sine wave
const GROUND_AMPLITUDE = 15;
const GROUND_PERIOD = 30;

// constants for the slopes that modify the base sine wave
const MIN_Y_OFFSET = -120;
const MAX_Y_OFFSET = 120;
const MIN_SLOPE_LEN = 25;
const MAX_SLOPE_LEN = 50;
const MIN_GRADIENT = 0;
const MAX_GRADIENT = 1;

// all the things that a seed can do
const SEED_FALLING = 0;
const SEED_RESTING = 1;
const SEED_DIGGING = 2;
const SEED_GROWING = 3;
const SEED_RADIUS = 3;
const SEED_MIN_REST = 60;
const SEED_MAX_REST = 120;
const SEED_MIN_DEPTH = 10;
const SEED_MAX_DEPTH = 20;
const SEED_MIN_DIG_SPEED = 0.04;
const SEED_MAX_DIG_SPEED = 0.4;

// instructions for growing trees
const BRANCH_GROWING = 100;
const BRANCH_MATURE = 101;
const TREE_MIN_GROW_SPEED = 0.1;
const TREE_MAX_GROW_SPEED = 0.4;
const TOTAL_FORK_ANGLE = 120; // how widely branches spread. This should be < 360
const UP_DIRECTION_DEGREES = 90; // don't change this. https://processing.org/tutorials/trig/
const MIN_BRANCH_DEPTH = 2; // # of times a tree can fork
const MAX_BRANCH_DEPTH = 4;
const FORK_CHANCE = 0.8;
const MIN_BRANCHES = 1.8; // # of branches a tree limb forks into
const MAX_BRANCHES = 5.35; // (subjected to round()ing, so need to -/+ 0.? to make random() fairer)
const MIN_FORK_THRESHOLD = 0.5; // at what percent of total growth does a limb fork?;
const MAX_FORK_THRESHOLD = 0.8;
const MIN_BRANCH_LEN = 30;
const MAX_BRANCH_LEN = 60;
const CHILD_BRANCH_MODIFIER = 0.75;

// make the leaves all pretty and stuff
const LEAF_HIDING = 200;
const LEAF_GROWING = 201;
const LEAF_MATURE = 202;
const LEAF_FALLING = 203;
const LEAF_DYING = 204;
const LEAF_MIN_RADIUS = 3;
const LEAF_MAX_RADIUS = 7;
const LEAF_MIN_HIDE_TIME = 360;
const LEAF_MAX_HIDE_TIME = 840;
const LEAF_MIN_MATURE_TIME = 360;
const LEAF_MAX_MATURE_TIME = 3000;
const LEAF_GROW_CHANCE = 0.6;
const LEAF_RANDOM_PALETTE_CHANCE = 0.1;
const LEAF_MIN_GROW_SPEED = 0.01;
const LEAF_MAX_GROW_SPEED = 0.04;
const LEAF_MIN_FALL_DISTANCE = 40;
const LEAF_MIN_FALL_RATE = 0.3;
const LEAF_MAX_FALL_RATE = 0.7;
const FLOAT_MIN_PERIOD = 0.7;
const FLOAT_MAX_PERIOD = 3.5;
const HFLOAT_MIN_AMPLITUDE = 0.75;
const HFLOAT_MAX_AMPLITUDE = 2.25;
const VFLOAT_MIN_AMPLITUDE = 0.55;
const VFLOAT_MAX_AMPLITUDE = 0.85;
const LEAF_FLOAT_PERIOD_MOD = 0.5; // larger leaves tend to have a longer period
const LEAF_FLOAT_AMP_MOD = 0.7; // leaves with longer periods tend to have larger amplitude
const LEAF_MIN_LAND_Y = 15;
const LEAF_MAX_LAND_Y = 100;

// did anyone really think that I would make something that *wasn't* full of bright colours?
const MIN_FADE_TIME = 40;
const MAX_FADE_TIME = 80;
const MAX_R = 255;
const MAX_G = 255;
const MAX_B = 255;
const MAX_ALPHA = 255;

// helpers: pass [r,g,b] arrays to p5 stroke/fill without creating color() objects
function strokeRgb(c) { stroke(c[0], c[1], c[2]); }
function fillRgb(c) { fill(c[0], c[1], c[2]); }
function fillRgba(c, a) { fill(c[0], c[1], c[2], a); }
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// constants that affect living things (so deep)
const GRAVITY = 0.05;
const DECAY = 1.5;

/* Unfortunately, we can only use random with floats. However we need a fair
 * way of picking randomly from an array. If we had an array of size 3,
 * then the rounding would be more likely to pick second element, because:
 * round(random(0,2)) --> 0.0 to 0.4999 = 0, 0.5 to 1.4999 = 1, 1.5 to 2 = 2.
 *
 * in such a scenario the percentages for each element to be chosen are:
 * array[0] = 25%, array[1] = 50%, array[2] = 25.
 * this is remedied by subtracting 0.5 from the lower limit of our random(),
 * and adding 0.5 to the upper limit. (random() never returns the specified upper limit)
 */
const RANDOM_FIX = 0.5;

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('drawHere');
  if (IS_MOBILE) {
    pixelDensity(1);
    frameRate(30);
  } else {
    frameRate(30);
  }
  colorMode(RGB, MAX_R, MAX_G, MAX_B, MAX_ALPHA);
  ellipseMode(RADIUS);
  // CalcLand();
  CalcLandSpline();

  background(0);

  // draw ground to main canvas first (findGroundYPoints needs pixel data)
  drawLandSpine();
  findGroundYPoints();

  // cache ground to offscreen buffer — blit each frame instead of redrawing
  groundBuffer = createGraphics(width, height);
  drawLandSpine(groundBuffer);

  // I guess it's ok to just dump all this here?
  treeColours = [
    ['#C6D8FF', '#71A9F7', '#6B5CA5', '#72195A', '#4C1036'],
    ['#A5FFE5', '#8CC7A1', '#816E94', '#74226C', '#4B2142'],
    ['#B02E0C', '#EB4511', '#C1BFB5', '#8EB1C7', '#FEFDFF'],
    ['#1C3144', '#596F62', '#7EA16B', '#C3D898', '#70161E'],
    ['#12355B', '#420039', '#D72638', '#FFA5A5', '#FF570A'],
    ['#1C1C7F', '#CF5C36', '#EFC88B', '#F4E3B2', '#D3D5D7'],
    ['#9BE564', '#D7F75B', '#D19C1D', '#7D451B', '#472C1B'],
    ['#4C022C', '#DE3C4B', '#87F5FB', '#4C1E30', '#CEC3C1'],
    ['#00274C', '#708D81', '#F4D58D', '#BF0603', '#8D0801'],
    ['#E5D7E2', '#FF8811', '#143642', '#119EA0', '#B21911']
  ].map(row => row.map(hexToRgb));

  leafColours = [
    ['#007FB2', '#2D9599', '#70A288', '#DAB785', '#D5896F'],
    ['#D0EFB1', '#B3D89C', '#7DC1AB', '#77A6B6', '#4D7298'],
    ['#577590', '#F3CA40', '#F2A541', '#F08A4B', '#D78A76'],
    ['#E8C547', '#6D80F2', '#4D5061', '#7287FF', '#CDD1C4'],
    ['#5B0C21', '#CC2A3D', '#E5325F', '#FC9F94', '#FFB7C5'],
    ['#61E294', '#7BCDBA', '#6E71AF', '#BD93D8', '#B47AEA'],
    ['#FABC3C', '#FFB238', '#F19143', '#FF773D', '#F55536'],
    ['#5BBA6F', '#3FA34D', '#2A9134', '#137547', '#054A29'],
    ['#574AE2', '#222A68', '#654597', '#AB81CD', '#E2ADF2'],
    ['#26547C', '#EF476F', '#FFD166', '#06D6A0', '#FFFCF9']
  ].map(row => row.map(hexToRgb));
}

function draw() {
  background(0);
  clickWait = max(clickWait - 1, 0);

  // blit cached ground
  image(groundBuffer, 0, 0);

  // go through seeds backwards, because we delete dead seeds after running
  // (deleting while iterating forwards would mess things up)
  strokeWeight(2);
  for (let i = seeds.length - 1; i >= 0; i--) {
    seeds[i].Run();
    if (!seeds[i].isAlive()) {
      seeds[i] = seeds[seeds.length - 1];
      seeds.pop();
    }
  }

  for (let i = 0; i < trees.length; i++) {
    trees[i].Run();
  }

  // leaves are filled ellipses — set noStroke once for all leaves
  noStroke();

  // draw leave on the ground behind other leaves
  for (let i = leavesDying.length - 1; i >= 0; i--) {
    leavesDying[i].Run();
    if (!leavesDying[i].isAlive()) {
      leavesDying[i] = leavesDying[leavesDying.length - 1];
      leavesDying.pop();
    }
  }

  for (let i = leavesAlive.length - 1; i >= 0; i--) {
    leavesAlive[i].Run();
    if (leavesAlive[i].status == LEAF_DYING) {
      leavesDying.push(leavesAlive[i]);
      leavesAlive[i] = leavesAlive[leavesAlive.length - 1];
      leavesAlive.pop();
    }
  }
}

// it's the ciiiiiiircle of liiiiiife! (...kindof)
function mousePressed() {
  if (mouseY >= groundY[mouseX] || clickWait > 1)
    return; // either clicked below ground or clicked too quickly

  seeds.push(new Seed(mouseX, mouseY));
  clickWait = 5;
}

// from little things big things grow~
class Seed {
  constructor(x, y) {
    this.xPos = x;
    this.yPos = y;
    this.velocity = 0;
    this.alpha = MAX_ALPHA;
    this.status = SEED_FALLING;
    this.restTime = round(random(SEED_MIN_REST, SEED_MAX_REST));
    this.digDepth = round(random(SEED_MIN_DEPTH, SEED_MAX_DEPTH));
    this.landingY = groundY[x];
  }

  // primary function bringing seed to life
  Run() {
    this.Update();
    this.Display();
  }

  // tell the seed to do its seed thing
  Update() {
    switch (this.status) {
      case SEED_FALLING:
        this.yPos += this.velocity;
        this.velocity += GRAVITY;
        // are we still falling?
        if (this.yPos >= this.landingY) { this.status = SEED_RESTING; }
        break;

      case SEED_RESTING:
        this.restTime--;
        if (this.restTime <= 0) { this.status = SEED_DIGGING; }
        break;

      // seed decelerates linearly as it digs, to a given minimum
      case SEED_DIGGING: {
        let digSpeed = SEED_MAX_DIG_SPEED * (1 - ((this.yPos - this.landingY) / (this.digDepth)));
        digSpeed = digSpeed > SEED_MIN_DIG_SPEED ? digSpeed : SEED_MIN_DIG_SPEED;
        this.yPos += digSpeed;

        if (this.yPos >= this.landingY + this.digDepth) {
          // seed has germinated!
          trees.push(new Trunk(round(this.xPos), round(this.yPos)));
          this.status = SEED_GROWING;
        }
        break;
      }

      case SEED_GROWING:
        this.alpha -= DECAY;
        this.alpha = this.alpha > 0 ? this.alpha : 0;
        break;
    }
  }

  // draw seed (he comments, unnecessarily)
  Display() {
    noStroke();
    fill(MAX_R, MAX_G, MAX_B, this.alpha);
    ellipse(this.xPos, this.yPos, SEED_RADIUS, SEED_RADIUS);
  }

  // seed has lived a fruitful life (quite literally)
  isAlive() {
    return (this.alpha > 0);
  }
}

// There are no trees. Only branches
// (sounds like the tag-line to our forest's favourite poor quality soap opera)
class Branch {
  constructor(x, y, depth, parent, angle, branchCols, leafCols) {
    this.children = [];
    this.parent = parent;
    this.leaf = null;
    this.status = BRANCH_GROWING;
    this.ancestorsGrown = false; // technically not necessary, saves CPU
    this.treeFullyGrown = false; // technically not necessary, saves CPU
    this.branchDepth = depth; // technically not necessary, saves CPU
    this.x1 = x; this.y1 = y;
    this.x2 = x; this.y2 = y;
    this.angle = angle;
    this.len = 0;
    this.willFork = false;
    this.forked = false;
    this.forkThreshold = 0;
    this.leafWait = 0;
    this.branchColours = branchCols;
    this.leafColours = leafCols;

    // each branch is shorter than its parent
    this.maxLen = random(MIN_BRANCH_LEN, MAX_BRANCH_LEN);
    this.maxLen *= pow(CHILD_BRANCH_MODIFIER, depth);

    // check if we are going to fork
    if ((this.branchDepth < MIN_BRANCH_DEPTH) ||
      ((this.branchDepth < MAX_BRANCH_DEPTH) && (random(1) < FORK_CHANCE))) {
      this.willFork = true;
      // randomise when we fork
      this.forkThreshold = random(MIN_FORK_THRESHOLD, MAX_FORK_THRESHOLD);
    }
  }

  Run() {
    this.Update();
    this.Display();

    //run child branches (if any)
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].Run();
    }
  }

  Update() {
    // if we or the parent are still growing, recalc branch coords
    if (this.status == BRANCH_GROWING) {
      // growth decelerates linearly, to a given minimum
      let growth = TREE_MAX_GROW_SPEED * (1 - (this.len / this.maxLen));
      growth = growth > TREE_MIN_GROW_SPEED ? growth : TREE_MIN_GROW_SPEED;
      this.len += growth;

      // Check if it's time to put out new shoots
      if ((this.willFork) && (!this.forked) && ((this.len / this.maxLen) >= this.forkThreshold)) {
        this.Fork();
        this.forked = true;
      }
      // finished growing?
      if (this.len >= this.maxLen) {
        this.status = BRANCH_MATURE;
        this.getRoot().registerGrown();
      }
      this.recalcCoords();
      strokeRgb(this.branchColours.curCol);
    }
    else if (!this.ancestorsGrown) {
      // one or more ancestors still growing, update branch coords
      this.recalcCoords();
      this.ancestorsGrown = this.AllAncestorsGrown();
      strokeRgb(this.branchColours.curCol);
    }
    else if (!this.treeFullyGrown) {
      // wait for entire tree fully grown before colour cycle animation
      this.CheckAddLeaf();
      this.treeFullyGrown = this.EntireTreeGrown();
      strokeRgb(this.branchColours.curCol);
    }
    else { // tree fully grown, animate branch colours
      this.CheckAddLeaf();
      strokeRgb(this.branchColours.Fade());
    }
  }

  Display() {
    line(this.x1, this.y1, this.x2, this.y2);
  }

  // walk up to the root trunk (called once per branch lifetime, not per frame)
  getRoot() {
    let node = this;
    while (node.parent !== null) node = node.parent;
    return node;
  }

  // branch forks into new, smaller branches
  Fork() {
    const numChildren = round(random(MIN_BRANCHES, MAX_BRANCHES));
    this.getRoot().registerBranches(numChildren);
    for (let i = 0; i < numChildren; i++) {
      const twigAngle = this.CalcAngle(this.angle, i, numChildren);
      const p = new Palette(this.branchColours.colours);
      this.children[i] = new Branch(round(this.x2), round(this.y2), this.branchDepth + 1, this, twigAngle, p, this.leafColours);
    }
  }

  // calculate the angle that the new branch will grow at
  CalcAngle(parentAngle, twigCount, totalTwigs) {
    // it's ok to go > 0 here because of the mysteries of trigonometry
    const firstTwigAngle = parentAngle - (TOTAL_FORK_ANGLE / 2);
    // we'll have a twig at the start *and* end of the given arc, hence the -1 here
    const twigIntervalAngle = TOTAL_FORK_ANGLE / (totalTwigs - 1);
    const twigAngle = firstTwigAngle + (twigIntervalAngle * twigCount);
    return twigAngle;
  }

  // if this is a leaf branch that doesnt have a, er, leaf, maybe grow one
  CheckAddLeaf() {
    // don't grow leaves outside the window
    if ((this.x2 > -1) && (this.x2 < width)) {
      if ((this.children.length == 0) && (this.leafWait == 0) && (this.leaf == null)) {
        if (random(1) < LEAF_GROW_CHANCE) {
          // mix it up! Leaves have a small chance to get a random colour palette
          let p;
          if (random(1) < LEAF_RANDOM_PALETTE_CHANCE) {
            p = new Palette(GetLeafColours());
          }
          else {
            p = new Palette(this.leafColours);
          }
          this.leaf = new Leaf(this, this.x2, this.y2, p);
          leavesAlive.push(this.leaf);
        }
        else {
          this.leafWait = round(random(LEAF_MIN_MATURE_TIME, LEAF_MAX_MATURE_TIME));
        }
      }
      else if (this.leafWait > 0) { this.leafWait--; }
    }
  }

  recalcCoords() {
    // calculate branch end point: time to break out our sohcahtoa
    const theta = radians(this.angle);
    this.x2 = this.x1 + (cos(theta) * this.len);
    this.y2 = this.y1 - (sin(theta) * this.len);

    // children needs to know that parent has moved
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].SetX1Y1(this.x2, this.y2);
    }
  }

  SetX1Y1(x, y) {
    this.x1 = x;
    this.y1 = y;
  }

  // I get the feeling that these next three functions are probably duplicating
  // work in some way or another. Seemed the easiest way to go about it though...
  AllAncestorsGrown() {
    if (this.parent.status == BRANCH_GROWING) {
      return false;
    }
    else {
      return this.parent.AllAncestorsGrown();
    }
  }

  EntireTreeGrown() {
    return this.getRoot().EntireTreeGrown();
  }
}

// the trunk is a branch that has no ancestors and a branch depth of 0
class Trunk extends Branch {
  constructor(x, y) {
    super(x, y, 0, null, UP_DIRECTION_DEGREES, new Palette(GetTreeColours()), GetLeafColours());
    this.ancestorsGrown = true;
    this.totalBranches = 1; // counts self
    this.grownBranches = 0;
  }

  AllAncestorsGrown() {
    return true;
  }

  EntireTreeGrown() {
    return this.grownBranches === this.totalBranches;
  }

  // called by Branch.Fork() to register new children
  registerBranches(count) {
    this.totalBranches += count;
  }

  // called when any branch reaches BRANCH_MATURE
  registerGrown() {
    this.grownBranches++;
  }
}

// I am a leaf on the wind; watch how I soar!
class Leaf {
  constructor(b, x, y, p) {
    this.parent = b;
    this.xPos = x;
    this.yPos = y;
    this.colours = p;
    this.xOffset = 0;
    this.yOffset = 0;
    this.status = LEAF_HIDING;
    this.radius = 0;
    this.alpha = MAX_ALPHA;

    // SO MANY RANDOM VARIABLES
    this.hideTime = round(random(LEAF_MIN_HIDE_TIME, LEAF_MAX_HIDE_TIME));
    this.matureTime = round(random(LEAF_MIN_MATURE_TIME, LEAF_MAX_MATURE_TIME));
    this.maxRadius = random(LEAF_MIN_RADIUS, LEAF_MAX_RADIUS);
    this.fallRate = random(LEAF_MIN_FALL_RATE, LEAF_MAX_FALL_RATE);
    this.period = random(FLOAT_MIN_PERIOD, FLOAT_MAX_PERIOD) * (1 + (this.maxRadius * LEAF_FLOAT_PERIOD_MOD));
    this.hAmplitude = random(HFLOAT_MIN_AMPLITUDE, HFLOAT_MAX_AMPLITUDE) * (1 + (this.period * LEAF_FLOAT_AMP_MOD));
    this.vAmplitude = random(VFLOAT_MIN_AMPLITUDE, VFLOAT_MAX_AMPLITUDE) * (1 + (this.period * LEAF_FLOAT_AMP_MOD));
    this.yLanding = random(LEAF_MIN_LAND_Y, LEAF_MAX_LAND_Y);
  }

  Run() {
    this.Update();
    this.Display();
  }

  Update() {
    switch (this.status) {
      case LEAF_HIDING:
        this.hideTime--;
        if (this.hideTime <= 0) {
          this.status = LEAF_GROWING;
        }
        break;

      // growth speed decelerates linearly, to a given minimum
      case LEAF_GROWING: {
        let growth = LEAF_MAX_GROW_SPEED * (1 - (this.radius / this.maxRadius));
        growth = growth > LEAF_MIN_GROW_SPEED ? growth : LEAF_MIN_GROW_SPEED;
        this.radius += growth;

        // finished growing?
        if (this.radius >= this.maxRadius) {
          this.status = LEAF_MATURE;
        }
        fillRgb(this.colours.curCol);
        break;
      }

      // leaf soaks up the sun for a while
      case LEAF_MATURE:
        this.matureTime--;
        if (this.matureTime <= 0) {
          this.status = LEAF_FALLING;
          this.parent.leaf = null;
        }
        fillRgb(this.colours.Fade());
        break;

      // help, I've fallen and I can't get up!
      case LEAF_FALLING: {
        if (((this.yPos - this.yOffset) - this.parent.y2 < LEAF_MIN_FALL_DISTANCE) ||
          ((this.yPos - this.yOffset) - groundY[round(constrain((this.xPos + this.xOffset), 0, width - 1))] < this.yLanding)) {
          // sine wave governs leaf path, cosine modifies rate of descent
          this.yPos += this.fallRate;
          const x = this.yPos - this.parent.y2;
          this.xOffset = sin(x / this.period) * this.hAmplitude;
          // does PI count as a magic number here? Need to phase-shift cosine wave
          this.yOffset = (cos(((2 * x) / this.period) + PI) * this.vAmplitude) + this.vAmplitude;
        }
        else {
          this.status = LEAF_DYING;
        }
        fillRgb(this.colours.Fade());
        break;
      }

      // till thou return unto the ground; for out of it wast thou taken:
      // for dust thou art, and unto dust shalt thou return
      case LEAF_DYING: {
        this.alpha -= DECAY;
        this.alpha = this.alpha > 0 ? this.alpha : 0;
        fillRgba(this.colours.curCol, round(this.alpha));
        break;
      }
    }
  }

  Display() {
    if (this.status != LEAF_HIDING) {
      ellipse(this.xPos + this.xOffset, this.yPos - this.yOffset, this.radius, this.radius);
    }
  }

  isAlive() {
    return (this.alpha > 0);
  }
}

class Palette {
  constructor(colours) {
    this.colours = colours;
    this.curCol = [0, 0, 0];
    this.deltaR = 0; this.deltaG = 0; this.deltaB = 0;
    this.fadeFrame = 0;
    this.fadeTime = 0;
    this.nextColIdx = -1;

    this.nextCol = this.GetRandom();
    this.GetNextColour();
  }

  // fading from one colour to the next
  Fade() {
    let r = this.curCol[0] + this.deltaR;
    let g = this.curCol[1] + this.deltaG;
    let b = this.curCol[2] + this.deltaB;
    if (r < 0) r = 0; else if (r > MAX_R) r = MAX_R;
    if (g < 0) g = 0; else if (g > MAX_G) g = MAX_G;
    if (b < 0) b = 0; else if (b > MAX_B) b = MAX_B;

    this.curCol[0] = r;
    this.curCol[1] = g;
    this.curCol[2] = b;

    // time to pick the next colour to fade to?
    if (this.fadeFrame == this.fadeTime) {
      this.GetNextColour();
      this.fadeFrame = 0;
    }
    else {
      this.fadeFrame++;
    }
    return this.curCol;
  }

  // pick the next colour to cycle to. Calculate deltas for RGB
  GetNextColour() {
    // copy nextCol into curCol (don't share reference — Fade mutates curCol in-place)
    this.curCol[0] = this.nextCol[0];
    this.curCol[1] = this.nextCol[1];
    this.curCol[2] = this.nextCol[2];
    const prevIdx = this.nextColIdx;
    while (this.nextColIdx === prevIdx) {
      this.nextCol = this.GetRandom();
    }

    // how long will this take?
    this.fadeTime = round(random(MIN_FADE_TIME, MAX_FADE_TIME));

    this.deltaR = (this.nextCol[0] - this.curCol[0]) / this.fadeTime;
    this.deltaG = (this.nextCol[1] - this.curCol[1]) / this.fadeTime;
    this.deltaB = (this.nextCol[2] - this.curCol[2]) / this.fadeTime;
  }

  GetRandom() {
    this.nextColIdx = round(random(0 - RANDOM_FIX, this.colours.length - 1 + RANDOM_FIX));
    return this.colours[this.nextColIdx];
  }
}

// generate points for a spline to represent the ground
function CalcLandSpline() {
  const getRandomXInc = () => round(random(GROUND_X_MIN_INTERVAL, GROUND_X_MAX_INTERVAL));
  const getRandomY = () => round(random(height * GROUND_MIN_Y_PERC, height * GROUND_MAX_Y_PERC));

  let nextX = 0;
  groundPoints.push({ 'x': nextX, 'y': getRandomY() });

  while (nextX < width) {
    nextX = min(nextX + getRandomXInc(), width);
    groundPoints.push({ 'x': nextX, 'y': getRandomY() });
  }
}

// draw the ground spline (optionally to an offscreen buffer)
function drawLandSpine(gfx) {
  const g = gfx || window;
  g.noFill();
  g.stroke(MAX_R, MAX_G, MAX_B, MAX_ALPHA);
  g.strokeWeight(1);
  for (let i = 0; i < groundPoints.length - 1; i++) {
    const p = [
      groundPoints[max(i - 1, 0)],
      groundPoints[i],
      groundPoints[min(i + 1, groundPoints.length - 1)],
      groundPoints[min(i + 2, groundPoints.length - 1)]
    ]
    g.curve(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
  }
}

// find ground Y coordinates for each X coordinate. Requires ground to be drawn first!
function findGroundYPoints() {
  // there is absolutely a proper way to calculate the intersection of a spline and a line,
  // but I can't be bothered. Just look for the first non-black pixel from the top down.
  const d = pixelDensity();
  loadPixels();
  for (let x = 0; x < width; x++) {
    let y = 0;
    // x * d makes sense, but y * d * width * d is not immediately obvious
    // the first * d accounts for pixel density horizontally, the second * d accounts for pixel density vertically
    while (pixels[(x * d + y * d * width * d) * 4] == 0 && y < height) {
      y++;
    }
    groundY[x] = y;
  }
}

// calculate land: sine wave +/- random "slopes"
function CalcLand() {
  // coords start at 0,0 so max X is actually width - 1
  const sketchWidth = width - 1;
  // lowest possible point of land
  const lowPoint = MIN_Y_OFFSET - (GROUND_AMPLITUDE * 2) - (MAX_SLOPE_LEN * MAX_GRADIENT);
  let curX = 0;
  let yOffset = round(random(MIN_Y_OFFSET, MAX_Y_OFFSET));

  // keep generating slopes and applying them to the base sine wave for the entire width
  while (curX < sketchWidth) {
    // length and gradient of next slope
    const slopeLen = CalcSlopeLen(sketchWidth - curX);
    const slopeDirection = CalcSlopeDir(yOffset);
    let slopeGrad = round(random(MIN_GRADIENT, MAX_GRADIENT));
    slopeGrad *= slopeDirection;

    // calculate y values (sinewave + current slope)
    for (let x = curX; x <= curX + slopeLen; x++) {
      const yBase = (GROUND_AMPLITUDE * sin(x / GROUND_PERIOD)) + (height + lowPoint);
      yOffset += slopeGrad;
      groundY[x] = round(yBase + yOffset);
    }
    curX += slopeLen;
  }
}

// randomly calculate the length of the next ground slope
// don't return a value longer than the remaining width of the screen!
function CalcSlopeLen(remainingWidth) {
  if (remainingWidth < MIN_SLOPE_LEN) { // only a bit of space left, don't bother randomising
    return remainingWidth;
  }
  else if (remainingWidth < MAX_SLOPE_LEN) { // almost out of space! Still can random though
    return round(random(MIN_SLOPE_LEN, remainingWidth));
  }
  else { // enough space for normal random length
    return round(random(MIN_SLOPE_LEN, MAX_SLOPE_LEN));
  }
}

// randomly calculate if a slope is going upwards or downwards
// if we're above/below our stated max/min then slope back towards 0
function CalcSlopeDir(yOffset) {
  if (yOffset < MIN_Y_OFFSET) {
    return 1;
  }
  else if (yOffset > MAX_Y_OFFSET) {
    return -1;
  }
  else {
    return round(random(1)) == 1 ? 1 : -1;
  }
}

function GetTreeColours() {
  const i = round(random(0 - RANDOM_FIX, treeColours.length - 1 + RANDOM_FIX));
  return treeColours[i];
}

function GetLeafColours() {
  const i = round(random(0 - RANDOM_FIX, leafColours.length - 1 + RANDOM_FIX));
  return leafColours[i];
}
