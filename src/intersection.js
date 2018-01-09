var { cross, dot, subtract, scaleAndAdd } = require("gl-vec3")

module.exports.rayTriangleIntersection = rayTriangleIntersection

var EPS = Number.EPSILON
var d = new Float32Array(3 * 6)
var e1 = d.subarray(0, 3)
var e2 = d.subarray(3, 6)
var h = d.subarray(6, 9)
var s = d.subarray(9, 12)
var q = d.subarray(12, 15)

function rayTriangleIntersection(o, p, dir, tri) {
  var a, f, u, dist

  p1 = tri[0]
  p2 = tri[1]
  p3 = tri[2]

  // edges
  subtract(e1, p2, p1)
  subtract(e2, p3, p1)

  // determinant
  cross(h, dir, e2)
  a = dot(e1, h)

  // if determinant very near zero, ray lies along plane
  if (a > -EPS && a < EPS)
    return false

  f = 1 / a
  subtract(s, p, p1)
  u = f * dot(s, h)

  if (u < 0 || u > 1)
    return false

  cross(q, s, e1)
  v = f * dot(dir, q)

  if (v < 0 || u + v > 1)
    return false

  dist = f * dot(e2, q)

  if (dist <= EPS)
    return false
  
  scaleAndAdd(o, p, dir, dist)
  return true
}
