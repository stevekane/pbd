const { length, squaredDistance, normalize, scale, scaleAndAdd, add, subtract, copy, dot } = require("gl-vec3")
const { rayTriangleIntersection } = require("./intersection")
const { pow } = Math

module.exports = solve

function applyExternalForces(dt, gravity, points) {
  for (const { velocity } of points) {
    // v = v + g * dt
    scaleAndAdd(velocity, velocity, gravity, dt)
  }
}

function dampVelocities(damping, points) {
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

function adjustVelocities(constraints, points) {
  const vt = [ 0, 0, 0 ]
  const vn = [ 0, 0, 0 ]

  for (const { i, normal } of constraints.collisions) {
    const { velocity } = points[i]
    const mvn = dot(velocity, normal)

    scale(vn, normal, mvn)
    subtract(vt, velocity, vn)
    scaleAndAdd(velocity, vt, vn, -1)
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

// will detect collisions with minx, miny, minz. only for testing
function generateTestCollisionConstraints(xmin, ymin, zmin, meshes, points) {
  const direction = [ 0, 0, 0 ]
  const hitPoint = [ 0, 0, 0 ]

  for (var i = 0; i < points.length; i++) {
    const { predicted } = points[i]
    const xpenetration = xmin - predicted[0]
    const ypenetration = ymin - predicted[1]
    const zpenetration = zmin - predicted[2]

    if (xpenetration > 0) {
      constraints.collisions.push({
        normal: [ 1, 0, 0 ],
        surfacePoint: [ predicted[0] + xpenetration, predicted[1], predicted[2] ],
        i: i
      })  
    }
    if (ypenetration > 0) {
      constraints.collisions.push({
        normal: [ 0, 1, 0 ],
        surfacePoint: [ predicted[0], predicted[1] + ypenetration, predicted[2] ],
        i: i
      })  
    }
    if (zpenetration > 0) {
      constraints.collisions.push({
        normal: [ 0, 0, 1 ],
        surfacePoint: [ predicted[0], predicted[1], predicted[2] + zpenetration ],
        i: i
      })  
    }
  }
}

function projectConstraints(iterations, constraints, points) {
  const { distances, collisions, positions } = constraints
  const inverseIterations = 1 / iterations
  // for distances
  const dp = [ 0, 0, 0 ]
  const dir = [ 0, 0, 0 ]
  // for collisions
  const fromSurface = [ 0, 0, 0 ]


  while (iterations--) {
    for (let i = 0; i < distances.length; i++) {
      let { i1, i2, restLength, stiffness } = distances[i]
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

    for (let j = 0; j < collisions.length; j++) {
      let { i, normal, surfacePoint } = collisions[j]
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

    // simple solution but only valid for stiffness of 1
    for (let k = 0; k < positions.length; k++) {
      let { i, position } = positions[k]
      let p = points[i]        

      copy(p.predicted, position)
    }
  }
}

function solve(dt, iterationCount, damping, gravity, constraints, meshes, points) {
  constraints.positions[1].position[0] = Math.abs(Math.sin(performance.now() / 452) * 2)
  constraints.positions[1].position[1] = Math.sin(performance.now() / 1000) * 2
  constraints.positions[1].position[2] = Math.cos(performance.now() / 1000) * 2
  applyExternalForces(dt, gravity, points)
  dampVelocities(damping, points)
  estimatePositions(dt, points)
  constraints.collisions.splice(0)
  generateCollisionConstraints(constraints, meshes, points)
  generateTestCollisionConstraints(0, -10, -10, meshes, points)
  projectConstraints(iterationCount, constraints, points)
  updateVelocities(dt, points)
  updatePositions(points)
  adjustVelocities(constraints, points) // apply restitution etc
}
