const V3 = require("gl-vec3")
const { rayTriangleIntersection } = require("./intersection")

exports.applyExternalForces = applyExternalForces
exports.estimatePositions = estimatePositions
exports.updateVelocities = updateVelocities
exports.updateCollisions = updateCollisions
exports.projectConstraints = projectConstraints

function applyExternalForces(dt, DAMPING_FACTOR, GRAVITY, ws, vs) {
  const GDT = GRAVITY * dt
  const count = vs.length / 3

  for (var i = 0, o; i < count; i++) {
    o = i * 3 + 1
    vs[o] *= DAMPING_FACTOR 
    vs[o] += GDT * ws[i]
  }
}

function estimatePositions(dt, estimates, ps, vs) {
  var particleCount = estimates.length
  var i = 0

  while (i < particleCount) {
    estimates[i] = ps[i] + dt * vs[i++]
    estimates[i] = ps[i] + dt * vs[i++]
    estimates[i] = ps[i] + dt * vs[i++]
  }
}

function updateVelocities(dt, estimates, ps, vs) {
  if (dt == 0) 
    return

  var particleCount = vs.length
  var invdt = 1 / dt
  var i = 0

  while (i < particleCount) {
    vs[i] = (estimates[i] - ps[i++]) * invdt
    vs[i] = (estimates[i] - ps[i++]) * invdt
    vs[i] = (estimates[i] - ps[i++]) * invdt
  }
}

// ps and es are flat arrays. tris is [ [x,y,z], [x,y,z], [x,y,z] ]
function updateCollisions(frame, cs, tris, normals, es, ps) {
  var collisionPoint = [ 0, 0, 0 ] 
  var collides = false
  var dir = [ 0, 0, 0 ]
  var dP = 0
  var toContact = 0
  var est, pos, normal

  // for all particles
  for (var i = 0; i < ps.length; i += 3) {
    pos = ps.slice(i, i + 3)
    est = es.slice(i, i + 3)
    // position delta
    dP = V3.squaredDistance(est, pos)
    // change vector
    V3.subtract(dir, est, pos)
    V3.normalize(dir, dir)

    // for all triangles
    for (var j = 0; j < tris.length; j++) {
      tri = tris[j]
      collides = rayTriangleIntersection(collisionPoint, pos, dir, tri)
      
      if (collides) {
        toContact = V3.squaredDistance(collisionPoint, pos)
        if (toContact <= dP) {
          normal = normals.slice(j, 3)
          qc = collisionPoint.slice(0, 3)

          cs.push({ i: i / 3, normal, qc })
        }
      }
    }
  }
}

function projectConstraints(iterations, estimates, ws, ccs, dcs) {
  let inviterations = 1 / iterations

  while (iterations-- > 0) {
    for (let i = 0; i < dcs.length; i++) {
      let { d: restLength, k, i1, i2 } = dcs[i] 
      let dk = 1 - Math.pow(1 - k, inviterations)
      let w1 = ws[i1]
      let w2 = ws[i2]
      let p1 = estimates.subarray(i1 * 3, i1 * 3 + 3)
      let p2 = estimates.subarray(i2 * 3, i2 * 3 + 3)
      let dp = V3.subtract([ 0, 0, 0 ], p1, p2)
      let dist = V3.length(dp)
      let C = dist - restLength // distance constraint function

      if (C < 0)
        continue

      let dir = [ 0, 0, 0 ]

      V3.normalize(dir, dp)
      let wsum = w1 + w2
      let f = dk * C / wsum
      let f1 = -w1 * f
      let f2 = w2 * f
      let dp1 = [ 0, 0, 0 ]
      let dp2 = [ 0, 0, 0 ]

      V3.scale(dp1, dir, f1)
      V3.scale(dp2, dir, f2)

      V3.add(p1, p1, dp1)
      V3.add(p2, p2, dp2)
    }

    // TODO: saved for whatever...could throw out
    // var inviterations = 1 / iterations
    // var distanceConstraintCount = dcs.length
    // var collisionConstraintCount = ccs.length
    // var i = 0
    // var c, d
    // var i1, i2
    // var x1, y1, z1
    // var x2, y2, z2
    // var dx, dy, dz
    // var dp1, dp2
    // var dist, distdiff, dirx, diry, dirz
    // var w1, w2, wsum
    // var k
    // var dp1x, dp1y, dp1z
    // var dp2x, dp2y, dp2z
    // var w1, w2

    // var normal

    // let i = 0
    // while (i < distanceConstraintCount) {
    //   c = dcs[i++]
    //   d = c.d
    //   k = 1 - Math.pow(1 - c.k, inviterations) // TODO: pre-calculate
    //   w1 = ws[c.i1]
    //   w2 = ws[c.i2]
    //   i1 = c.i1 * 3
    //   i2 = c.i2 * 3
    //   x1 = estimates[i1++]
    //   y1 = estimates[i1++]
    //   z1 = estimates[i1]
    //   x2 = estimates[i2++]
    //   y2 = estimates[i2++]
    //   z2 = estimates[i2]
    //   dx = x1 - x2
    //   dy = y1 - y2
    //   dz = z1 - z2
    //   dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    //   distdiff = dist - d // the distance constraint function

    //   // constraint is satisfied if C >= 0
    //   if (distdiff < 0) 
    //     continue

    //   dirx = dx / dist
    //   diry = dy / dist
    //   dirz = dz / dist
    //   wsum = w1 + w2
    //   dp1x = k * -w1 * distdiff * dirx / wsum
    //   dp1y = k * -w1 * distdiff * diry / wsum
    //   dp1z = k * -w1 * distdiff * dirz / wsum
    //   dp2x = k * w2 * distdiff * dirx / wsum
    //   dp2y = k * w2 * distdiff * diry / wsum
    //   dp2z = k * w2 * distdiff * dirz / wsum
    //   estimates[i1--] = dp1z + z1
    //   estimates[i1--] = dp1y + y1
    //   estimates[i1]   = dp1x + x1
    //   estimates[i2--] = dp2z + z2
    //   estimates[i2--] = dp2y + y2
    //   estimates[i2]   = dp2x + x2
    // }
    // i = 0
    // while (i < collisionConstraintCount) {
    //   c = ccs[i++]
    //   w = ws[c.i]
    //   i1 = c.i * 3
    //   x1 = estimates[i1++]
    //   y1 = estimates[i1++]
    //   z1 = estimates[i1]
    //   normal = c.normal
    //   // C(p) = dot(p - qc, n)
    //   //      = (p - qc) * n
    //   //      = pn - qcn 
    //   //
    //   // therefore
    //   //
    //   // dC(p) = n
    //   // 
    //   // therefore 
    //   // 
    //   // length of dC(p) = 1
    //   // 
    //   // therefore
    //   //
    //   // s = dot(p - qc, n) / w
    //   //
    //   // therefore
    //   //
    //   // dP = -s * w * dC(p)
    //   //    = -dot(p - qc, n) * n
    //   //
    //   // This seems somewhat intuitive. It says that you project 
    //   // the negative of the penetration vector onto the normal
    //   // and multiply by the normal
    //   dist 
    //     = (x1 - qc[0]) * normal[0]
    //     + (y1 - qc[1]) * normal[1]
    //     + (z1 - qc[2]) * normal[2]

    //   // constraint is satisfied if C >= 0
    //   if (dist >= 0)
    //     continue
    //   
    //   dp1x = -dist * normal[0]
    //   dp1y = -dist * normal[1]
    //   dp1z = -dist * normal[2]
    //   estimates[i1--] = dp1z + z1
    //   estimates[i1--] = dp1y + y1
    //   estimates[i1]   = dp1x + x1
    // }
  }
}
