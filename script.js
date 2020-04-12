ALIVE_COLOR = 'red';
DEAD_COLOR = 'white';
PATTERN_COLOR = 'blue';

CELL_BORDER = 2;
CELL_SIZE = 10;


var patterns = {
  'block': [[0, 0], [1, 0], [0, 1], [1, 1]],
  'blinker': [[0, 0], [0, -1], [0, 1]],
  'glider': [[0, 0], [1, 0], [2, 0], [2, -1], [1, -2]],
  'toad': [[0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1]],
  'beacon': [[0, 0], [0, -1], [-1, -1], [-1, 0], [1, 1], [1, 2], [2, 1], [2, 2]],
  'lwss': [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, -1], [4, -2], [3, -3], [-1, -1], [-1, -3]],
  'pulsar': [
    [-2, -1], [-3, -1], [-4, -1], [-6, -2], [-6, -3], [-6, -4], [-4, -6], [-3, -6], [-2, -6], [-1, -4], [-1, -3], [-1, -2],
    [2, 1], [3, 1], [4, 1], [6, 2], [6, 3], [6, 4], [4, 6], [3, 6], [2, 6], [1, 4], [1, 3], [1, 2],
    [2, -1], [3, -1], [4, -1], [6, -2], [6, -3], [6, -4], [4, -6], [3, -6], [2, -6], [1, -4], [1, -3], [1, -2],
    [-2, 1], [-3, 1], [-4, 1], [-6, 2], [-6, 3], [-6, 4], [-4, 6], [-3, 6], [-2, 6], [-1, 4], [-1, 3], [-1, 2],
  ]
}
class Control {
  constructor(control, manager) {
    this.control = control;
    this.manager = manager;

    var clearButton = document.getElementById('clear');
    var slowerButton = document.getElementById('slower');
    var fasterButton = document.getElementById('faster');
    var startButton = document.getElementById('start');
    var pauseButton = document.getElementById('pause');
    this.speed = document.getElementById('speed');
    this.performance = document.getElementById('performance');
    this.interval = null;

    self = this;

    /* pattern control */
    var links = control.getElementsByClassName('pattern-btn');
    for(var i=0; i<links.length; ++i) {
      links[i].addEventListener('click', function(evt) {
        var pattern = evt.target.dataset.pattern;
        manager.clearPattern();
        manager.setPattern(pattern);
        clearButton.disabled = false;
      });
    }

    clearButton.addEventListener('click', function(evt) {
      manager.clearPattern();
      clearButton.disabled = true;
    });

    /* speed control */
    this.start();

    slowerButton.addEventListener('click', function(evt) {
      self.speed.value = parseInt(self.speed.value) + 50 + 'ms';
      if(self.interval) {
        self.start();
      }
    });
    fasterButton.addEventListener('click', function(evt) {
      self.speed.value = parseInt(self.speed.value) - 50 + 'ms';
      if(self.interval) {
        self.start();
      }
    });
    startButton.addEventListener('click', function(evt) {
      self.start();
      startButton.disabled = true;
      pauseButton.disabled = false;
    });
    pauseButton.addEventListener('click', function(evt) {
      self.pause();
      startButton.disabled = false;
      pauseButton.disabled = true;
    });
  }

  pause() {
    if(this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
  }

  start() {
    this.pause();

    self = this;
    this.interval = setInterval(function() {
      manager.simulate();
      self.performance.value = manager.latestPerformance.toFixed(1) + 'ms';
    }, parseInt(this.speed.value));
  }
}

class Cell {
  constructor(x, y, alive) {
    this.x = x;
    this.y = y;
    this.alive = alive;
  }

  isNeighbour(cell) {
    return Math.abs(cell.x - this.x) <= 1 && Math.abs(cell.y - this.y) <= 1 && cell.alive;
  }

  getNeighbours() {
    return [
      {x: this.x, y: this.y - 1},
      {x: this.x + 1, y: this.y - 1},
      {x: this.x + 1, y: this.y},
      {x: this.x + 1, y: this.y + 1},
      {x: this.x, y: this.y + 1},
      {x: this.x - 1, y: this.y + 1},
      {x: this.x - 1, y: this.y},
      {x: this.x - 1, y: this.y - 1},
    ]
  }
}


class Manager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.latestPerformance = null;

    this.cells = [];
    const { width, height } = canvas.getBoundingClientRect();
    this.ctx.canvas.width  = width;
    this.ctx.canvas.height = height;

    /* draw grid */
    this.ctx.fillStyle = '#404040';
    for(var i=0; i<width; i += CELL_SIZE + CELL_BORDER) {
      this.ctx.fillRect(i, 0, CELL_BORDER, height);
    }
    for(var i=0; i<height; i += CELL_SIZE + CELL_BORDER) {
      this.ctx.fillRect(0, i, width, CELL_BORDER);
    }

    this.isMouseDown = false;
    this.latestPosition = {};
    this.currentPattern = null;
    var self = this;

    canvas.addEventListener('click', function(evt) {
      var x = Math.floor(evt.clientX / (CELL_BORDER + CELL_SIZE));
      var y = Math.floor(evt.clientY / (CELL_BORDER + CELL_SIZE));

      if(self.currentPattern) {
        self.addPattern(x, y, patterns[self.currentPattern]);
      } else {
        self.add(x, y, true);
      }
      self.latestPosition = {x: x, y: y};
    }, false);

    canvas.addEventListener('mousedown', function(evt) {
      self.isMouseDown = true;
    });

    canvas.addEventListener('mouseup', function(evt) {
      self.isMouseDown = false;
    });

    canvas.addEventListener('mousemove', function(evt) {
      if(!self.isMouseDown && !self.currentPattern) return;

      var x = Math.floor(evt.clientX / (CELL_BORDER + CELL_SIZE));
      var y = Math.floor(evt.clientY / (CELL_BORDER + CELL_SIZE));

      if(x != self.latestPosition.x || y != self.latestPosition.y) {
        if(self.isMouseDown && !self.currentPattern) {
          self.add(x, y, false);
        } else if (self.currentPattern){
          self.drawPattern(self.latestPosition.x, self.latestPosition.y, patterns[self.currentPattern], true);
          self.redraw();
          self.drawPattern(x, y, patterns[self.currentPattern], false);
        }

        self.latestPosition = {'x': x, 'y': y};
      }
    });
  }

  setPattern(pattern) {
    this.currentPattern = pattern;
  }

  addPattern(x, y, pattern) {
    for(var i=0; i<pattern.length; ++i) {
      this.add(
        pattern[i][0] + x,
        pattern[i][1] + y,
        false,
      );
    }
  }

  clearPattern() {
    if(this.currentPattern) {
      this.drawPattern(
      this.latestPosition.x,
      this.latestPosition.y,
      patterns[this.currentPattern],
      true,
      );
    }
    this.currentPattern = null;
    this.redraw();
  }

  drawPattern(x, y, pattern, erase) {
    var color = PATTERN_COLOR;
    if(erase) {
      color = DEAD_COLOR;
    }
    for(var i=0; i<pattern.length; ++i) {
      this.drawCellByXY(
        pattern[i][0] + x,
        pattern[i][1] + y,
        color,
      );
    }
  }

  getCell(x, y) {
    for(var i=0; i<this.cells.length; i++) {
      var cell = this.cells[i];
      if(cell.x == x && cell.y == y) return cell;;
    }

    return null;
  }

  add(x, y, toggle) {
    var cell = this.getCell(x, y);
    if(cell && toggle) {
      cell.alive = false;
    } else if(!cell) {
      this.cells.push(new Cell(x, y, true));
    }
    this.redraw();
    this.cells = this.cells.filter(function(value, index, array) { return value.alive; });
  }

  redraw() {
    for(var i=0; i<this.cells.length; i++) {
      this.drawCell(this.cells[i]);
    }
  }

  drawCellByXY(x, y, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * (CELL_BORDER + CELL_SIZE) + CELL_BORDER,
      y * (CELL_BORDER+ CELL_SIZE) + CELL_BORDER,
      CELL_SIZE,
      CELL_SIZE,
    );
  }

  drawCell(cell) {
    var color;
    if(cell.alive) {
      color = ALIVE_COLOR;
    } else {
      color = DEAD_COLOR;
    }

    this.drawCellByXY(cell.x, cell.y, color);
  }

  simulate() {
    var t0 = performance.now();
    var aliveToCheck = {};
    var deadToCheck = {};

    for(var i in this.cells) {
      var cell = this.cells[i];
      aliveToCheck[cell.x + ';' + cell.y] = cell;

      var neighbours = cell.getNeighbours();
      for(var j=0; j<neighbours.length; j++) {
        var neighbour = neighbours[j];
        var key = neighbour.x + ';' + neighbour.y;
        deadToCheck[key] = new Cell(neighbour.x, neighbour.y, false);
      }
    }

    for(var i in aliveToCheck) {
      if(i in deadToCheck) {
        delete deadToCheck[i];
      }
    }

    var new_cells = [];
    var mergedCheck = Object.assign({}, aliveToCheck, deadToCheck);

    var sortedAliveToCheck = [];
    for(var i in aliveToCheck) {
      sortedAliveToCheck.push(aliveToCheck[i]);
    }
    sortedAliveToCheck.sort((a, b) => (a.x > b.x) ? 1 : -1)

    for(const outer_key in mergedCheck) {
      var outer_cell = mergedCheck[outer_key];
      var neighbours = 0;
      for(const inner_key in sortedAliveToCheck) {
        var inner_cell = sortedAliveToCheck[inner_key];
        if(outer_cell == inner_cell) continue;
        if(outer_cell.x < (inner_cell.x - 1)) break;

        neighbours += outer_cell.isNeighbour(inner_cell);
      }

      if(outer_cell.alive) {
        if(neighbours >= 2 && neighbours <= 3) {
          new_cells.push(new Cell(outer_cell.x, outer_cell.y, true));
        }
      } else {
        if(neighbours == 3) {
          new_cells.push(new Cell(outer_cell.x, outer_cell.y, true));
        }
      }
    }

    /* clear old generation */
    for(var i in this.cells) {
      this.cells[i].alive = false;
    }
    this.redraw();

    /* populate grid with new generation */
    this.cells = new_cells;
    this.redraw();

    this.latestPerformance = performance.now() -t0;
  }
}
