"use strict"

const Regl = require("regl")
const Camera = require("regl-camera")
const rti = require("ray-triangle-intersection")
const wtrti = require("ray-triangle-intersection")
const V3 = require("gl-vec3")
const { Render } = require("./rendering")

const regl = Regl()
const camera = Camera(regl, {
  distance: 4,
  theta: 3 * Math.PI / 2
})
const render = Render(regl)
const ITERATION_COUNT = 10
const PARTICLE_COUNT = 4
const DISTANCE_CONSTRAINT_COUNT = PARTICLE_COUNT
const G = -10
const invmasses = new Float32Array(PARTICLE_COUNT)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const positions = [
  new Float32Array(PARTICLE_COUNT * 3),
  new Float32Array(PARTICLE_COUNT * 3)
]
const distanceConstraintLines = new Float32Array(DISTANCE_CONSTRAINT_COUNT * 2 * 3)
const distanceConstraints = []

const SPREAD = 1
const p1 = [ 0, SPREAD, 0 ]
const p2 = [ 0, 0, SPREAD ] //[ -SPREAD, SPREAD, SPREAD ]
const p3 = [ 0, 0, -SPREAD ] // [ -SPREAD, SPREAD, -SPREAD ]
const p4 = [ SPREAD, SPREAD, 0 ]
const LONG_D = Math.sqrt(SPREAD * SPREAD + SPREAD * SPREAD)

positions[0].set(p1, 0)
positions[0].set(p2, 3)
positions[0].set(p3, 6)
positions[0].set(p4, 9)

invmasses[0] = 0
invmasses[1] = .01 // .5
invmasses[2] = .01 // .5
invmasses[3] = 1

distanceConstraints.push({ i1: 0, i2: 1, d: LONG_D, k: 1 })
distanceConstraints.push({ i1: 1, i2: 2, d: SPREAD * 2, k: 1 })
distanceConstraints.push({ i1: 2, i2: 0, d: LONG_D, k: 1 })
distanceConstraints.push({ i1: 0, i2: 3, d: SPREAD, k: 1 })

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

function applyExternalForces(dt, ws, vs) {
  const DAMPING_FACTOR = .99
  const GDT = G * dt

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    vs[i * 3 + 1] = vs[i * 3 + 1] * DAMPING_FACTOR + GDT * ws[i]
  }
}

function estimatePositions(dt, estimates, ps, vs) {
  var i = 0
  var l = estimates.length

  while (i < l) {
    estimates[i] = ps[i] + dt * vs[i++]
    estimates[i] = ps[i] + dt * vs[i++]
    estimates[i] = ps[i] + dt * vs[i++]
  }
}

function updateVelocities(dt, estimates, ps, vs) {
  if (dt == 0) 
    return

  var invdt = 1 / dt
  var i = 0
  var l = vs.length

  while (i < l) {
    vs[i] = (estimates[i] - ps[i++]) * invdt
    vs[i] = (estimates[i] - ps[i++]) * invdt
    vs[i] = (estimates[i] - ps[i++]) * invdt
  }
}

function projectConstraints(iterations, estimates, ws, dcs) {
  var inviterations = 1 / iterations
  var l = dcs.length
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
      c = dcs[i++]
      d = c.d
      k = 1 - Math.pow(1 - c.k, inviterations) // TODO: seems like this could be stored once
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

const DT = 1 / 60
const MAX_TIME = .1
const INIT_TIME = 200
const particleProps = {
  positions: positionbuffer,
  count: PARTICLE_COUNT,
  size: 10,
  color: [ 0, .2, .5, 1 ],
  primitive: "points"
}
const distanceConstraintProps = {
  positions: distanceConstraintBuffer,
  count: 0,
  color: [ .2, .4, .1, 1 ],
  primitive: "lines"
}
const meshProps = {
  positions: new Float32Array([ p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2] ]),
  count: 3,
  color: [ .7, .7, .1, 1 ],
  primitive: "triangles"
}

var currentTime = performance.now() * .001
var t = 0
var acc = 0
var i = 1
var ii = 0
var tmp = i
var count = 0
var tri = [ p1, p2, p3 ]

setTimeout(function () {
  regl.frame(function () {
    var newTime = performance.now() * .001
    var frameTime = Math.min(newTime - currentTime, MAX_TIME)

    currentTime = newTime

    if (!window.paused) {
      acc = acc + frameTime
      // ii is always estimates. i is always positions
      while (acc >= DT) {
        tmp = i
        i = ii
        ii = tmp
        applyExternalForces(DT, invmasses, velocities)
        estimatePositions(DT, positions[ii], positions[i], velocities)

        var predicted = positions[ii].subarray(9, 12)
        var point = positions[i].subarray(9, 12)
        var p1 = positions[ii].subarray(0, 3)
        var p2 = positions[ii].subarray(3, 6)
        var p3 = positions[ii].subarray(6, 9)
        var dir = [ 0, 0, 0 ]
        var contact = [ 0, 0, 0 ]
        
        V3.subtract(dir, predicted, point)
        V3.normalize(dir, dir)

        var collides = rti(contact, point, dir, tri)
        var distanceMoved = V3.distance(point, predicted)
        var toContact = collides ? V3.distance(contact, point) : Infinity

        if (collides && toContact < distanceMoved) {
          console.log("hit")
        }

        projectConstraints(ITERATION_COUNT, positions[ii], invmasses, distanceConstraints)
        updateVelocities(DT, positions[ii], positions[i], velocities)
        t += DT
        acc -= DT
      }
    }

    count = updateDistanceConstraintLines(positions[ii], distanceConstraints, distanceConstraintLines)
    distanceConstraintBuffer.subdata(distanceConstraintLines)
    positionbuffer.subdata(positions[ii])
    distanceConstraintProps.count = count
    camera(function (c) {
      render(particleProps)
      render(meshProps)
      render(distanceConstraintProps)
    })
  })
}, INIT_TIME)

window.paused = false
window.positions = positions
