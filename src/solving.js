const V3 = require("gl-vec3")
const { normalize, length, scale, scaleAndAdd, subtract, copy } = require("gl-vec3")
const { rayTriangleIntersection } = require("./intersection")
const { pow } = Math

module.exports = solve

function applyExternalForces(dt, gravity, points) {
  for (const { velocity, inverseMass } of points) {
    scaleAndAdd(velocity, velocity, gravity, dt * inverseMass)
  }
}

function dampVelocity(damping, points) {
  for (const { velocity } of points) {
    scale(velocity, velocity, damping) 
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

function projectConstraints(iterations, constraints, points) {
  const { distances } = constraints
  const inverseIterations = 1 / iterations
  const dp = [ 0, 0, 0 ]
  const dir = [ 0, 0, 0 ]

  for (var i = 0; i < iterations; i++) {
    for (const dc of distances) {
      const { i1, i2, restLength, stiffness } = dc
      const p1 = points[i1]
      const p2 = points[i2]
      const dstiffness = 1 - pow(1 - stiffness, inverseIterations)

      subtract(dp, p1.predicted, p2.predicted)

      const dist = length(dp)
      const c = dist - restLength

      normalize(dir, dp)

      const inverseMassSum = p1.inverseMass + p2.inverseMass
      const f = dstiffness * c / inverseMassSum
      const f1 = -p1.inverseMass * f
      const f2 = p2.inverseMass * f

      scaleAndAdd(p1.predicted, p1.predicted, dir, f1)
      scaleAndAdd(p2.predicted, p2.predicted, dir, f2)
    }
  }
}

function solve(dt, iterationCount, damping, gravity, constraints, points) {
  applyExternalForces(dt, gravity, points)
  dampVelocity(damping, points)
  estimatePositions(dt, points)
  projectConstraints(iterationCount, constraints, points)
  updateVelocities(dt, points)
  updatePositions(points)
}
