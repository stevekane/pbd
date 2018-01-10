const regl = require("regl")()
const camera = require("regl-camera")(regl, { distance: 4, theta: Math.PI / 3 })
const V3 = require("gl-vec3")
const solve = require("./solving")
const render = require("./rendering")(regl)

const INIT_DELAY = 100
const DT = 1 / 60
const GRAVITY = [ 0, -10, 0 ]
const DAMPING = .98
const COLOR_1 = [ 0, 0, 1, 1 ]
const COLOR_2 = [ 1, 0, 0, 1 ]
const COLOR_3 = [ 0, 1, 0, 1 ]
const ITERATION_COUNT = 10


const constraints = {
  distances: [
    { i1: 0, i2: 1, restLength: .5, stiffness: .1 },
    { i1: 1, i2: 2, restLength: .5, stiffness: .1 }, 
    { i1: 2, i2: 3, restLength: .25, stiffness: .1 }, 
    { i1: 2, i2: 4, restLength: .25, stiffness: .1 },
    { i1: 3, i2: 4, restLength: .25, stiffness: .1 } 
  ],
  collisions: []
}
const points = [
  new Point(0, 0, 0, 0),
  new Point(-1, 0, 0, 1),
  new Point(-2, 0, 0, 1),
  new Point(-2, 0, -1, 1),
  new Point(-2, 0, 1, 1)
]
const triangles = [
  [ [ 0, 1, 0 ], [ 0, -1, 1 ], [ 0, -1, -1 ] ]
]

function Point(x, y, z, inverseMass) {
  this.inverseMass = inverseMass
  this.velocity = [ 0, 0, 0 ]
  this.position = [ x, y, z ]
  this.predicted = [ 0, 0, 0 ]
}

function init() {
  regl.frame(update)
}

function update() {
  solve(DT, ITERATION_COUNT, DAMPING, GRAVITY, constraints, points)
  camera(draw)
}

function draw() {
  const positions = constraints.distances.reduce(function (cs, c) {
    cs.push(points[c.i1].position)
    cs.push(points[c.i2].position)
    return cs
  }, [])

  render({
    positions: points.map(p => p.position),
    count: points.length,
    color: COLOR_1,
    primitive: "points"
  })
  render({
    positions: triangles[0],
    count: 3,
    color: COLOR_2,
    primitive: "triangles"
  })
  render({
    positions: positions,
    count: constraints.distances.length * 2,
    color: COLOR_3,
    primitive: "lines"
  })
}

window.points = points
window.constraints = constraints
setTimeout(init, INIT_DELAY)
