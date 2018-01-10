const V3 = require("gl-vec3")
const { scale, scaleAndAdd, subtract, copy } = require("gl-vec3")
const { rayTriangleIntersection } = require("./intersection")

module.exports = solve

function applyExternalForces(dt, damping, gravity, points) {
  for (const { velocity, inverseMass } of points) {
    velocity[1] = velocity[1] * damping + gravity * dt * inverseMass
  }
}

function estimatePositions(dt, points) {
  for (const { predicted, position, velocity } of points) {
    scaleAndAdd(predicted, position, velocity, dt)
  }
}

function updateVelocities(dt, points) {
  if (dt == 0) 
    return

  const invdt = 1 / dt

  for (const { predicted, position, velocity } of points) {
    subtract(velocity, predicted, position)
    scale(velocity, velocity, invdt)
  }
}

function updatePositions(points) {
  for (const { predicted, position } of points) {
    copy(position, predicted) 
  }
}

// COLLISION CONSTRAINT DERIVATION
//
// C(p)     = dot(p - qc, n)
//          = (p - qc) * n
//          = pn - qcn 
//
// dC(p)    = n
// |dC(p)|  = 1
// s        = dot(p - qc, n) / w
// dP       = -s * w * dC(p)
//          = -dot(p - qc, n) * n
function projectConstraints(iterations, constraints, points) {
  const { distances, collisions } = constraints

  for (var i = 0; i < iterations; i++) {
    for (const dc of distances) {
    
    }
  }
}

function solve(dt, iterationCount, damping, gravity, constraints, points) {
  applyExternalForces(dt, damping, gravity, points)
  estimatePositions(dt, points)
  projectConstraints(iterationCount, constraints, points)
  updateVelocities(dt, points)
  updatePositions(points)
}
