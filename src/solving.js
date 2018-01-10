const { length, squaredDistance, scale, scaleAndAdd, subtract, copy } = require("gl-vec3")
const { rayTriangleIntersection } = require("./intersection")
const { pow } = Math

module.exports = solve

function applyExternalForces(dt, gravity, points) {
  for (const { velocity, inverseMass } of points) {
    // v = v + dt * w * dt
    scaleAndAdd(velocity, velocity, gravity, dt * inverseMass)
  }
}

function dampVelocity(damping, points) {
  for (const { velocity } of points) {
    // v = damping * v
    scale(velocity, velocity, damping) 
  }
}

function estimatePositions(dt, points) {
  for (const { predicted, position, velocity } of points) {
    // p = x + dt * v
    scaleAndAdd(predicted, position, velocity, dt)
  }
}

function updateVelocities(dt, points) {
  if (dt == 0) 
    return

  const invdt = 1 / dt

  for (const { predicted, position, velocity } of points) {
    // v = (p - x) / dt
    subtract(velocity, predicted, position)
    scale(velocity, velocity, invdt)
  }
}

function updatePositions(points) {
  for (const { predicted, position } of points) {
    // x = p
    copy(position, predicted) 
  }
}

// TODO: since these are line segments, we could do bounding box collision
// checks first to eliminate segments more quickly
const direction = [ 0, 0, 0 ]
const hitPoint = [ 0, 0, 0 ]
function generateCollisionConstraints(constraints, meshes, points) {
  for (var i = 0; i < points.length; i++) { 
    const { position, predicted } = points[i]

    subtract(direction, predicted, position)
    for (const { triangles, normals } of meshes) {
      for (var j = 0; j < triangles.length / 3; j++) {
        const triangle = triangles.slice(j * 3, 3)
        const normal = normals[j]

        if (!rayTriangleIntersection(hitPoint, position, direction, triangle))
          continue

        //TODO: need to check if the dist to hitPoint is less than direction
        const toSurface = squaredDistance(hitPoint, position)
        const toPredicted = squaredDistance(predicted, position)

        if (toSurface > toPredicted)
          continue

        constraints.collisions.push({ 
          normal: [ ...normal ], 
          surfacePoint: [ ...hitPoint ],
          i: i
        })
      }
    } 
  }
}

const dp = [ 0, 0, 0 ]
const dir = [ 0, 0, 0 ]
function projectConstraints(iterations, constraints, points) {
  const { distances } = constraints
  const inverseIterations = 1 / iterations

  for (var i = 0; i < iterations; i++) {
    for (const dc of distances) {
      const { i1, i2, restLength, stiffness } = dc
      const p1 = points[i1]
      const p2 = points[i2]
      const dstiffness = 1 - pow(1 - stiffness, inverseIterations)

      subtract(dp, p1.predicted, p2.predicted)

      // |p1 - p2| - d
      const dist = length(dp)
      const c = dist - restLength

      // if we are already satisfied do nothing
      if (c > -Number.EPSILON && c < Number.EPSILON)
        continue

      // normalize to get unit vector for direction
      scale(dir, dp, 1 / dist)

      const inverseMassSum = p1.inverseMass + p2.inverseMass
      const f = dstiffness * c / inverseMassSum
      const f1 = -p1.inverseMass * f
      const f2 = p2.inverseMass * f

      // dp1 = k * -w1 / (w1 + w2) * (|p1 - p2| - d) * dir
      scaleAndAdd(p1.predicted, p1.predicted, dir, f1)
      // dp2 = k * w2 / (w1 + w2) * (|p1 - p2| - d) * dir
      scaleAndAdd(p2.predicted, p2.predicted, dir, f2)
    }
  }
}

function solve(dt, iterationCount, damping, gravity, constraints, meshes, points) {
  applyExternalForces(dt, gravity, points)
  dampVelocity(damping, points)
  estimatePositions(dt, points)
  constraints.collisions.splice(0)
  generateCollisionConstraints(constraints, meshes, points)
  if (constraints.collisions.length)
    console.log(JSON.stringify(constraints.collisions, null, 2))
  projectConstraints(iterationCount, constraints, points)
  updateVelocities(dt, points)
  updatePositions(points)
  // updateVelocities(points) // apply restitution etc
}
