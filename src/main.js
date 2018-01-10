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
const ITERATION_COUNT = 10

const constraints = {
  distances: [],
  collisions: []
}
const points = [
  new Point(0, 0, 0, 0),
  new Point(0, -1, 0, 1)
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
}

setTimeout(init, INIT_DELAY)
