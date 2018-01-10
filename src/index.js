"use strict"

const Regl = require("regl")
const Camera = require("regl-camera")
const V3 = require("gl-vec3")
const {   
  Render,
  updateDistanceConstraintLines
} = require("./rendering")
const { 
  applyExternalForces, 
  estimatePositions, 
  updateVelocities, 
  updateCollisions,
  projectConstraints 
} = require("./solving")

const regl = Regl()
const camera = Camera(regl, {
  distance: 4,
  theta: 3 * Math.PI / 4
})
const render = Render(regl)
const ITERATION_COUNT = 10
const PARTICLE_COUNT = 4
const DAMPING_FACTOR = .98
const G = -10
const invmasses = new Float32Array(PARTICLE_COUNT)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const positions = [
  new Float32Array(PARTICLE_COUNT * 3),
  new Float32Array(PARTICLE_COUNT * 3)
]
const distanceConstraintLines = new Float32Array(PARTICLE_COUNT * 2 * 3)
const distanceConstraints = []
const collisionConstraints = []
const impacts = []

const SPREAD = .2
const p1 = [ 0, SPREAD, 0 ]
const p2 = [ -SPREAD, SPREAD, 0 ]
const p3 = [ -2 * SPREAD, SPREAD, 0 ]
const p4 = [ -3 * SPREAD, SPREAD, 0 ]
const S = 1
const t1 = [ 0, S, 0 ]
const t2 = [ 0, -S, -S ]
const t3 = [ 0, -S, S ]
const tri = [ t1, t2, t3 ]
const tris = [ tri ]
const normals = []

positions[0].set(p1, 0)
positions[0].set(p2, 3)
positions[0].set(p3, 6)
positions[0].set(p4, 9)

invmasses[0] = 0
invmasses[1] = 1
invmasses[2] = 1
invmasses[3] = 1

distanceConstraints.push({ i1: 0, i2: 1, d: SPREAD, k: .1 })
distanceConstraints.push({ i1: 1, i2: 2, d: SPREAD, k: .1 })
distanceConstraints.push({ i1: 2, i2: 3, d: SPREAD, k: .1 })

// calculate normals
var e1 = [ 0, 0, 0 ]
var e2 = [ 0, 0, 0 ]
var n = [ 0, 0, 0 ]

for (const t of tris) {
  V3.subtract(e1, t[0], t[1])
  V3.subtract(e2, t[0], t[2])
  V3.cross(n, e1, e2)
  V3.normalize(n, n)
  normals.push(n[0], n[1], n[2])
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
const impactProps = {
  positions: impacts,
  count: 0,
  size: 20,
  color: [ .1, .8, .8, 1],
  primitive: "points"
}
const meshProps = {
  positions: tris[0],
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

setTimeout(function () {
  regl.frame(function ({ time, tick }) {
    var newTime = performance.now() * .001
    var frameTime = Math.min(newTime - currentTime, MAX_TIME)

    currentTime = newTime

    if (!window.paused) {
      acc += frameTime
      while (acc >= DT) {
        tmp = i
        i = ii
        ii = tmp
        applyExternalForces(DT, DAMPING_FACTOR, G, invmasses, velocities)
        estimatePositions(DT, positions[ii], positions[i], velocities)
        collisionConstraints.splice(0)
        updateCollisions(
          tick, 
          collisionConstraints, 
          tris, 
          normals, 
          positions[ii], 
          positions[i])
        projectConstraints(
          ITERATION_COUNT, 
          positions[ii], 
          invmasses, 
          collisionConstraints, 
          distanceConstraints)
        updateVelocities(DT, positions[ii], positions[i], velocities)
        t += DT
        acc -= DT
      }
    }

    for (const cc of collisionConstraints) {
      impacts.push(cc.qc)
    }
    impactProps.count = impacts.length
    impactProps.positions = impacts

    count = updateDistanceConstraintLines(positions[ii], distanceConstraints, distanceConstraintLines)
    distanceConstraintBuffer.subdata(distanceConstraintLines)
    distanceConstraintProps.count = count

    positionbuffer.subdata(positions[ii])


    camera(function (c) {
      render(particleProps)
      render(meshProps)
      render(distanceConstraintProps)
      render(impactProps)
    })
  })
}, INIT_TIME)

window.paused = false
window.positions = positions
window.collisionConstraints = collisionConstraints
