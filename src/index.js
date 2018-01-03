const Regl = require("regl")
const { RenderDistanceConstraints, RenderPoints } = require("./rendering")

const regl = Regl()
const renderDistanceConstraints = RenderDistanceConstraints(regl)
const renderPoints = RenderPoints(regl)
const rr = (min, max) => Math.random() * (max - min) + min
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
  invmasses[i + 0] = rr(-1, 1)
  t = i * Math.PI * 2 / PARTICLE_COUNT
  // positions[o + 0] = rr(-1, 1)
  // positions[o + 1] = rr(-1, 1)
  // positions[o + 2] = rr(-1, 1)
  positions[o + 0] = Math.cos(t) * .8
  positions[o + 1] = Math.sin(t) * .8
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

function applyExternalForces(dT, ps, vs) {
  for (var i = 0; i < PARTICLE_COUNT; i++) {
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

function projectConstraints(iterations, estimates, pcs) {
  while (iterations--) {
    console.log(pcs)
  }
}

function updateDistanceConstraintLines(ps, cs, cls) {
  var l = cs.length
  var i = 0
  var o = 0
  var c
  var i1, i2
  var p1x, p1y, p1z
  var p2x, p2y, p2z

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
  size: 40
}
var distanceConstraintProps = {
  count: 0,
  positions: distanceConstraintBuffer
}
var distanceConstraints = [
  { i1: 0, i2: 1, d: .4 },
  { i1: 1, i2: 2, d: .4 },
  { i1: 2, i2: 3, d: .4 },
  { i1: 3, i2: 0, d: .4 }
]

setTimeout(function () {
  regl.frame(function () {
    then = now
    now = performance.now()
    dT = (now - then) * .001
    applyExternalForces(dT, positions, velocities)
    // damp velocities?
    estimatePositions(dT, estimates, positions, velocities)
    // generate collision constraints
    // iterate/project constraints
    updateVelocities(dT, estimates, positions, velocities)
    updatePositions(estimates, positions)

    count = updateDistanceConstraintLines(positions, distanceConstraints, distanceConstraintLines)

    distanceConstraintProps.count = count
    distanceConstraintBuffer.subdata(distanceConstraintLines)
    positionbuffer.subdata(positions)
    renderPoints(particleProps)
    renderDistanceConstraints(distanceConstraintProps)
  })
}, 100)

window.dcls = distanceConstraintLines
window.positions = positions

console.log(positions)
