// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

let flowField, particles, easycam;
let initialParticles, particleSize;           // set in setup(), read-only after
let fpsSamples = [], lastFpsCheck = 0, governorSettled = false;  // FPS governor state
let initialZoomDone = false;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL).parent('drawHere');
  frameRate(60);
  colorMode(RGB, 255);

  easycam = createEasyCam();
  const radius = width / RADIUS_DIVISOR;
  easycam.setDistanceMin(radius * 0.5);
  easycam.setDistanceMax(radius * 10);

  // Scale particle count by total screen area (width × height), so portrait
  // phones get a fair allocation rather than being penalised for narrow width
  const areaRatio = Math.min(1.0,
    (windowWidth * windowHeight) / (REFERENCE_WIDTH * REFERENCE_HEIGHT));
  initialParticles = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES,
    Math.round(MAX_PARTICLES * areaRatio * AREA_RATIO_MULT)));

  // Dot size scales with width — sphere radius = width/RADIUS_DIVISOR
  const widthRatio = Math.min(1.0, windowWidth / REFERENCE_WIDTH);
  particleSize = Math.max(1, Math.round(PARTICLE_SIZE_BASE * Math.sqrt(widthRatio)));

  flowField = new FlowField(radius);
  particles = [];
  for (let i = 0; i < initialParticles; i++) {
    particles.push(new Particle(flowField, flowField.getRandomActiveSector()));
  }
}

function draw() {
  background(255);
  noLights(); // prevent default WEBGL ambient lighting from affecting flat-fill appearance

  // One-time zoom calibration: measure the sphere's actual on-screen pixel size
  // using the live projection matrix, then scale the camera distance so the sphere
  // fills 90% of min(width, height). Runs on frame 2 to let EasyCam initialise.
  if (!initialZoomDone && frameCount >= 2) {
    initialZoomDone = true;
    const r = flowField.getRadius();
    const d = easycam.getDistance();
    const fov = easycam.P5._renderer._curCamera.cameraFOV;
    const sphereScreenRadius = r * (height / 2) / (d * Math.tan(fov / 2));
    const targetRadius = Math.min(width, height) * 0.45;
    easycam.setDistance(d * sphereScreenRadius / targetRadius, 0);
    if (DEBUG) console.log(`Zoom calibrated: sphere ${Math.round(sphereScreenRadius * 2)}px → target ${Math.round(targetRadius * 2)}px (${Math.min(width, height)}px min dim, FOV ${(fov * 180 / Math.PI).toFixed(1)}°)`);
  }

  // FPS governor — check once per second (wall-clock, not frame-count)
  if (!governorSettled && millis() - lastFpsCheck >= 1000 && frameCount > 60) {
    lastFpsCheck = millis();
    fpsSamples.push(frameRate());
    if (fpsSamples.length > 5) fpsSamples.shift();  // 5-second rolling window

    const avgFPS = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    const batchSize = Math.max(1, Math.round(particles.length / 20));  // ~5% at a time

    if (avgFPS > FPS_TARGET_HIGH && particles.length < MAX_PARTICLES) {
      const toAdd = Math.min(batchSize, MAX_PARTICLES - particles.length);
      for (let i = 0; i < toAdd; i++)
        particles.push(new Particle(flowField, flowField.getRandomActiveSector()));
      if (DEBUG) console.log(`FPS ${avgFPS.toFixed(1)} > ${FPS_TARGET_HIGH} — added ${toAdd} particles (now ${particles.length})`);
      if (particles.length >= MAX_PARTICLES) {
        governorSettled = true;
        fpsSamples = [];
        if (DEBUG) console.log('Governor settled: MAX_PARTICLES reached');
      }
    } else if (avgFPS < FPS_TARGET_LOW && particles.length > MIN_PARTICLES) {
      const toRemove = Math.min(batchSize, particles.length - MIN_PARTICLES);
      particles.splice(particles.length - toRemove, toRemove);
      if (DEBUG) console.log(`FPS ${avgFPS.toFixed(1)} < ${FPS_TARGET_LOW} — removed ${toRemove} particles (now ${particles.length})`);
      if (particles.length <= MIN_PARTICLES) {
        governorSettled = true;
        fpsSamples = [];
        if (DEBUG) console.log('Governor settled: MIN_PARTICLES reached');
      }
    } else if (fpsSamples.length === 5) {
      // Full 5-second window and FPS is in band — lock
      governorSettled = true;
      fpsSamples = [];
      if (DEBUG) console.log(`Governor settled: FPS ${avgFPS.toFixed(1)} in band [${FPS_TARGET_LOW}, ${FPS_TARGET_HIGH}] at ${particles.length} particles`);
    } else if (DEBUG) {
      console.log(`FPS ${avgFPS.toFixed(1)} — ${particles.length} particles (${fpsSamples.length}/5 samples)`);
    }
  }

  flowField.update();
  if (DEBUG_SECTORS) flowField.displayDebug();

  drawParticles();

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
  }

  noFill();
  stroke(SPHERE_RGB, SPHERE_RGB, SPHERE_RGB, SPHERE_ALPHA);
  strokeWeight(1);
  sphere(flowField.getRadius(), SPHERE_RES, SPHERE_RES);
}

function drawParticles() {
  const BUCKET_COUNT = 16;
  const buckets = Array.from({length: BUCKET_COUNT}, () => []);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const speed = Math.sqrt(p.velX*p.velX + p.velY*p.velY + p.velZ*p.velZ) / MAX_SPEED_NORMALIZER;
    const grey = map(speed, 0, 1, SLOW_PARTICLE_GREY, 0);
    const bucket = constrain(Math.floor(grey / ((SLOW_PARTICLE_GREY + 1) / BUCKET_COUNT)), 0, BUCKET_COUNT - 1);
    buckets[bucket].push(p);
  }

  strokeWeight(particleSize * 2);
  noFill();
  for (let b = 0; b < BUCKET_COUNT; b++) {
    if (buckets[b].length === 0) continue;
    const grey = (b + 0.5) * ((SLOW_PARTICLE_GREY + 1) / BUCKET_COUNT);
    stroke(grey);
    beginShape(POINTS);
    for (const p of buckets[b]) vertex(p.posX, p.posY, p.posZ);
    endShape();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  const radius = width / RADIUS_DIVISOR;
  easycam.setDistanceMin(radius * 0.5);
  easycam.setDistanceMax(radius * 10);

  const widthRatio = Math.min(1.0, windowWidth / REFERENCE_WIDTH);
  particleSize = Math.max(1, Math.round(PARTICLE_SIZE_BASE * Math.sqrt(widthRatio)));

  const areaRatio = Math.min(1.0,
    (windowWidth * windowHeight) / (REFERENCE_WIDTH * REFERENCE_HEIGHT));
  initialParticles = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES,
    Math.round(MAX_PARTICLES * areaRatio * AREA_RATIO_MULT)));

  flowField = new FlowField(radius);
  particles = [];
  for (let i = 0; i < initialParticles; i++) {
    particles.push(new Particle(flowField, flowField.getRandomActiveSector()));
  }

  fpsSamples = [];
  governorSettled = false;
  initialZoomDone = false;
}
