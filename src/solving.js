exports.applyExternalForces = applyExternalForces
exports.estimatePositions = estimatePositions
exports.updateVelocities = updateVelocities
exports.projectConstraints = projectConstraints

function applyExternalForces(dt, DAMPING_FACTOR, GRAVITY, ws, vs) {
  const GDT = GRAVITY * dt
  const count = vs.length / 3

  for (var i = 0; i < count; i++) {
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

