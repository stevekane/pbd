const { length, squaredDistance, normalize, scale, scaleAndAdd, add, subtract, copy, dot } = require("gl-vec3")
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

function perpendicularTo([ x, y, z ]) {
  let out 

  if ( x != 0 )
    out = [ (-y - z) / x, 1, 1 ]
  else if (y != 0)
    out = [ 1, (-x - z) / y, 1 ]
  else if (z != 0)
    out = [ 1, (-x - y) / z, 1 ]
  else
    return [ 0, 0, 0 ]

  normalize(out, out)
  return out
}

function adjustVelocities(constraints, points) {
  const parallel = [ 0, 0, 0 ]
  const perpendicular = [ 0, 0, 0 ]

  // TODO: currently no material properties for friction
  for (const { i, normal } of constraints.collisions) {
    let { velocity } = points[i]
    let tangent = perpendicularTo(normal)
    let parallelMagnitude = dot(normal, velocity)
    let perpendicularMagnitude = dot(tangent, velocity)

    // reflect motion parallel to surface
    scale(parallel, normal, -parallelMagnitude)
    copy(velocity, parallel)
    // damp motion perpendicular to surface for friction 
    scale(perpendicular, tangent, perpendicularMagnitude)
    add(velocity, velocity, perpendicular)
  }
}

function generateCollisionConstraints(constraints, meshes, points) {
  const direction = [ 0, 0, 0 ]
  const hitPoint = [ 0, 0, 0 ]

  for (var i = 0; i < points.length; i++) { 
    const { position, predicted } = points[i]

    subtract(direction, predicted, position)
    for (const { triangles, normals } of meshes) {
      for (var j = 0; j < triangles.length / 3; j++) {
        const triangle = triangles.slice(j * 3, 3)
        const normal = normals[j]

        // normal is same direction as motion
        if (dot(normal, direction) > 0)
          continue

        // didn't intersect triangle
        if (!rayTriangleIntersection(hitPoint, position, direction, triangle))
          continue

        const toSurface = squaredDistance(hitPoint, position)
        const toPredicted = squaredDistance(predicted, position)

        // too far away
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

function projectConstraints(iterations, constraints, points) {
  const { distances, collisions } = constraints
  const inverseIterations = 1 / iterations
  // for distances
  const dp = [ 0, 0, 0 ]
  const dir = [ 0, 0, 0 ]
  // for collisions
  const fromSurface = [ 0, 0, 0 ]


  while (iterations--) {
    for (const { i1, i2, restLength, stiffness } of distances) {
      let p1 = points[i1]
      let p2 = points[i2]
      let dstiffness = 1 - pow(1 - stiffness, inverseIterations)
      let dist
      let c
      let inverseMassSum
      let f
      let f1
      let f2

      subtract(dp, p1.predicted, p2.predicted)

      // |p1 - p2| - d
      dist = length(dp)
      c = dist - restLength

      // if we are already satisfied do nothing
      if (c > -Number.EPSILON && c < Number.EPSILON)
        continue

      // normalize to get unit vector for direction
      scale(dir, dp, 1 / dist)

      inverseMassSum = p1.inverseMass + p2.inverseMass
      f = dstiffness * c / inverseMassSum
      f1 = -p1.inverseMass * f
      f2 = p2.inverseMass * f

      // dp1 = k * -w1 / (w1 + w2) * (|p1 - p2| - d) * dir
      scaleAndAdd(p1.predicted, p1.predicted, dir, f1)
      // dp2 = k * w2 / (w1 + w2) * (|p1 - p2| - d) * dir
      scaleAndAdd(p2.predicted, p2.predicted, dir, f2)
    }

    for (const { i, normal, surfacePoint } of collisions) {
      let p = points[i]
      let c
      let dc
      
      // k = 1
      // s = C(p) / w
      // dp = -s * w * dC(p)
      // dp = k * -w / w * dot(p - qc, n) * n
      //    = -k * dot(pqc, n) * n
      //    = -dot(pqc, n) * n
      subtract(fromSurface, p.predicted, surfacePoint)
      c = dot(fromSurface, normal)

      if (c >= 0)
        continue

      dc = normal
      scaleAndAdd(p.predicted, p.predicted, dc, -c)
    }
  }
}

function solve(dt, iterationCount, damping, gravity, constraints, meshes, points) {
  applyExternalForces(dt, gravity, points)
  dampVelocity(damping, points)
  estimatePositions(dt, points)
  constraints.collisions.splice(0)
  generateCollisionConstraints(constraints, meshes, points)
  projectConstraints(iterationCount, constraints, points)
  updateVelocities(dt, points)
  updatePositions(points)
  adjustVelocities(constraints, points) // apply restitution etc
}
