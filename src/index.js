"use strict"

const Regl = require("regl")
const { RenderDistanceConstraints, RenderPoints } = require("./rendering")

const regl = Regl()
const renderDistanceConstraints = RenderDistanceConstraints(regl)
const renderPoints = RenderPoints(regl)
const rr = (min, max) => Math.random() * (max - min) + min
const ITERATION_COUNT = 10
const PARTICLE_COUNT = 4
const DISTANCE_CONSTRAINT_COUNT = 4
const G = -1
const invmasses = new Float32Array(PARTICLE_COUNT)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const positions = new Float32Array(PARTICLE_COUNT * 3)
const estimates = new Float32Array(PARTICLE_COUNT * 3)
const distanceConstraintLines = new Float32Array(DISTANCE_CONSTRAINT_COUNT * 2 * 3)

for (var i = 0, o, t; i < PARTICLE_COUNT; i++) {
  o = i * 3
  invmasses[i + 0] = i / PARTICLE_COUNT
  t = i * Math.PI * 2 / PARTICLE_COUNT
  positions[o + 0] = Math.sin(t) * .8
  positions[o + 1] = Math.cos(t) * .8
  positions[o + 2] = 0
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
  var lambda = 1 / iterations
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
  var dp1x, dp1y, dp1z
  var dp2x, dp2y, dp2z
  var w1, w2

  while (iterations-- > 0) {
    while (i < l) {
      c = pcs[i++]
      d = c.d
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
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz) - d
      distdiff = dist - d
      dirx = dx / dist
      diry = dy / dist
      dirz = dz / dist
      wsum = w1 + w2
      // some redundant calculation here... could be refactored
      dp1x = lambda * -w1 * distdiff * dirx / wsum
      dp1y = lambda * -w1 * distdiff * diry / wsum
      dp1z = lambda * -w1 * distdiff * dirz / wsum
      dp2x = lambda * w2 * distdiff * dirx / wsum
      dp2y = lambda * w2 * distdiff * diry / wsum
      dp2z = lambda * w2 * distdiff * dirz / wsum
      estimates[i1--] = dp1z + z1
      estimates[i1--] = dp1y + y1
      estimates[i1]   = dp1x + x1
      estimates[i2--] = dp2z + z2
      estimates[i2--] = dp2y + y2
      estimates[i2]   = dp2x + x2
    }
  }
}

function distance(x1, y1, z1, x2, y2, z2) {
  var dx = x1 - x2
  var dy = y1 - y2
  var dz = z1 - z2

  dx *= dx
  dy *= dy
  dz *= dz
  return Math.sqrt(dx + dy + dz)
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
    cls.subarray
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
  size: 40
}
var distanceConstraintProps = {
  count: 0,
  positions: distanceConstraintBuffer
}
var distanceConstraints = [
  { i1: 0, i2: 1, d: .1 },
  { i1: 1, i2: 2, d: .1 },
  { i1: 2, i2: 3, d: .1 },
  // { i1: 3, i2: 0, d: .1 }
]

setTimeout(function () {
  regl.frame(function () {
    then = now
    now = performance.now()
    dT = (now - then) * .001
    applyExternalForces(dT, invmasses, positions, velocities)
    estimatePositions(dT, estimates, positions, velocities)
    projectConstraints(ITERATION_COUNT, estimates, invmasses, distanceConstraints)
    updateVelocities(dT, estimates, positions, velocities)
    updatePositions(estimates, positions)

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

window.dcls = distanceConstraintLines
window.positions = positions