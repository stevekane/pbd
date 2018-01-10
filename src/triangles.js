const { subtract, cross, normalize, clone } = require("gl-vec3")

module.exports.normal = normal

const e1 = [ 0, 0, 0 ]
const e2 = [ 0, 0, 0 ]
function normal(t) {
  const n = [ 0, 0, 0 ]

  subtract(e1, t[0], t[1])
  subtract(e2, t[0], t[2])
  cross(n, e1, e2)
  normalize(n, n)
  return [ n[0], n[1], n[2] ]
}
