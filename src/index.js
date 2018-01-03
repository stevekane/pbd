"use strict"

const Regl = require("regl")
const { RenderDistanceConstraints, RenderPoints } = require("./rendering")

const regl = Regl()
const renderDistanceConstraints = RenderDistanceConstraints(regl)
const renderPoints = RenderPoints(regl)
const rr = (min, max) => Math.random() * (max - min) + min
const rrint = (min, max) => Math.floor(rr(min, max))
const ITERATION_COUNT = 16
const PARTICLE_COUNT = 4000
const DISTANCE_CONSTRAINT_COUNT = PARTICLE_COUNT
const G = -1
const SPREAD = .5
const invmasses = new Float32Array(PARTICLE_COUNT)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const positions = new Float32Array(PARTICLE_COUNT * 3)
const estimates = new Float32Array(PARTICLE_COUNT * 3)
const distanceConstraintLines = new Float32Array(DISTANCE_CONSTRAINT_COUNT * 2 * 3)
const distanceConstraints = []

for (var i = 0, o, t; i < PARTICLE_COUNT; i++) {
  o = i * 3
  invmasses[i + 0] = i / PARTICLE_COUNT
  t = i * Math.PI * 2 / PARTICLE_COUNT
  positions[o + 0] = Math.sin(t) * SPREAD
  positions[o + 1] = Math.cos(t) * SPREAD
  positions[o + 2] = 0
}

for (var i = 0; i < PARTICLE_COUNT; i++) {
  distanceConstraints.push({ 
    i1: rrint(0, PARTICLE_COUNT), 
    i2: rrint(0, PARTICLE_COUNT), 
    d: rr(.1, .8), 
    k: rr(.1, .9)
  })
}

const invmassbuffer = regl.buffer({ 
  data: invmasses, 
  usage: "static"
})
const positionbuffer = regl.buffer({ 
  data: positions, 
  usage: "dynamic"
})
const distanceConstraintBuffer = regl.buffer({ 
  data: distanceConstraintLines, 
  usage: "dynamic"
})

function applyExternalForces(dT, ws, ps, vs) {
  for (var i = 0; i < PARTICLE_COUNT; i++) {
    if (ws[i] == 0)
      continue
    vs[i * 3 + 1] += dT * G // GRAVITY
  }
}

function estimatePositions(dT, estimates, ps, vs) {
  var i = 0
  var l = estimates.length

  while (i < l) {
    estimates[i] = ps[i] + dT * vs[i++]
    estimates[i] = ps[i] + dT * vs[i++]
    estimates[i] = ps[i] + dT * vs[i++]
  }
}

function updateVelocities(dT, estimates, ps, vs) {
  if (dT == 0) 
    return

  var invdT = 1 / dT
  var i = 0
  var l = vs.length

  while (i < l) {
    vs[i] = (estimates[i] - ps[i++]) * invdT
    vs[i] = (estimates[i] - ps[i++]) * invdT
    vs[i] = (estimates[i] - ps[i++]) * invdT
  }
}

function updatePositions(estimates, positions) {
  positions.set(estimates) 
}

function projectConstraints(iterations, estimates, ws, pcs) {
  var inviterations = 1 / iterations
  var l = pcs.length
  var i = 0
  var c, d
  var i1, i2
  var x1, y1, z1
  var x2, y2, z2
  var dx, dy, dz
  var dp1, dp2
  var dist, distdiff, dirx, diry, dirz
  var w1, w2, wsum
  var k
  var dp1x, dp1y, dp1z
  var dp2x, dp2y, dp2z
  var w1, w2

  while (iterations-- > 0) {
    while (i < l) {
      c = pcs[i++]
      d = c.d
      k = 1 - Math.pow(1 - c.k, inviterations)
      w1 = ws[c.i1]
      w2 = ws[c.i2]
      i1 = c.i1 * 3
      i2 = c.i2 * 3
      x1 = estimates[i1++]
      y1 = estimates[i1++]
      z1 = estimates[i1]
      x2 = estimates[i2++]
      y2 = estimates[i2++]
      z2 = estimates[i2]
      dx = x1 - x2
      dy = y1 - y2
      dz = z1 - z2
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      distdiff = dist - d
      // this is all specifically for distance constraints and inequality. perhaps generalize?
      if (distdiff < 0) continue
      dirx = dx / dist
      diry = dy / dist
      dirz = dz / dist
      wsum = w1 + w2
      //TODO: some redundant calculation here... could be refactored
      dp1x = k * -w1 * distdiff * dirx / wsum
      dp1y = k * -w1 * distdiff * diry / wsum
      dp1z = k * -w1 * distdiff * dirz / wsum
      dp2x = k * w2 * distdiff * dirx / wsum
      dp2y = k * w2 * distdiff * diry / wsum
      dp2z = k * w2 * distdiff * dirz / wsum
      estimates[i1--] = dp1z + z1
      estimates[i1--] = dp1y + y1
      estimates[i1]   = dp1x + x1
      estimates[i2--] = dp2z + z2
      estimates[i2--] = dp2y + y2
      estimates[i2]   = dp2x + x2
    }
  }
}

function updateDistanceConstraintLines(ps, cs, cls) {
  var l = cs.length
  var i = 0
  var o = 0
  var c
  var i1, i2

  while (i < l) {
    c = cs[i++]
    i1 = c.i1 * 3
    i2 = c.i2 * 3
    cls[o++] = ps[i1++]
    cls[o++] = ps[i1++]
    cls[o++] = ps[i1++]
    cls[o++] = ps[i2++]
    cls[o++] = ps[i2++]
    cls[o++] = ps[i2++]
  }
  return l * 2
}

var then = performance.now()
var now = performance.now()
var dT = 0
var count = 0
var particleProps = {
  positions: positionbuffer,
  inverseMasses: invmassbuffer,
  count: PARTICLE_COUNT,
  size: 80
}
var distanceConstraintProps = {
  count: 0,
  positions: distanceConstraintBuffer
}

setTimeout(function () {
  regl.frame(function () {
    // update timestep
    then = now
    now = performance.now()
    dT = (now - then) * .001

    // apply external forces aka gravity
    // applyExternalForces(dT, invmasses, positions, velocities)

    // estimate positions from current velocities
    estimatePositions(dT, estimates, positions, velocities)

    // iteratively project all constraints
    projectConstraints(ITERATION_COUNT, estimates, invmasses, distanceConstraints)

    // update velocity and position based on estimates/positions
    updateVelocities(dT, estimates, positions, velocities)
    updatePositions(estimates, positions)

    // update buffer containing lines for rendering constraints
    count = updateDistanceConstraintLines(positions, distanceConstraints, distanceConstraintLines)

    // update contents of buffers
    distanceConstraintBuffer.subdata(distanceConstraintLines)
    positionbuffer.subdata(positions)

    // update properties for rendering
    distanceConstraintProps.count = count

    // render points and constraints
    renderPoints(particleProps)
    renderDistanceConstraints(distanceConstraintProps)
  })
}, 100)

window.positions = positions
