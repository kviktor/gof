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
  ],
  'gun': [
    [0, 0], [-1, 0], [-1, 1], [-1, -1], [-2, -2], [-2, 2], [-3, 0], [-4, 3], [-4, -3], [-5, 3], [-5, -3], [-6, -2], [-6, 2], [-7, 1], [-7, 0], [-7, -1],
    [3, -1], [3, -2], [3, -3], [4, -1], [4, -2], [4, -3], [5, -4], [5, 0], [7, 0], [7, 1], [7, -4], [7, -5],
    [17, -2], [17, -3], [18, -2], [18, -3],
    [-16, 0], [-17, 0], [-16, -1], [-17, -1],
  ],
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


class Manager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.latestPerformance = null;

    this.cells = {};
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

  getKey(x, y) {
    return x + ';' + y;
  }

  add(x, y, toggle) {
    var key = this.getKey(x, y);
    if(key in this.cells && toggle) {
      this.cells[key].alive = !this.cells[key].alive
    } else if(!(key in this.cells)) {
      this.cells[key] = {
        x: x,
        y: y,
        alive: true,
      };
    }
    this.redraw();
  }

  redraw() {
    for(var i in this.cells) {
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

  isAlive(alive, aliveNeighbourCount) {
    if(alive) {
      if(aliveNeighbourCount >= 2 && aliveNeighbourCount <= 3) {
        return true;
      } else {
        return false;
      }
    } else {
      if(aliveNeighbourCount == 3) {
        return true;
      } else {
        return false;
      }
    }
  }

  simulate() {
    var t0 = performance.now();
    var newCells = JSON.parse(JSON.stringify(this.cells))
    var neighbours = [
      {x: 0, y: -1},
      {x: 1, y: -1},
      {x: 1, y: 0},
      {x: 1, y: 1},
      {x: 0, y: 1},
      {x: -1, y: 1},
      {x: -1, y: 0},
      {x: -1, y: -1},
    ]

    var aliveCellNeighbourCount, deadCellNeighbourCount;
    var cell, n, deadX, deadY, nk, innerKey, outerKey;

    for(var i in this.cells) {
      aliveCellNeighbourCount = 0;
      cell = this.cells[i];

      for(var aliveN in neighbours) {
        n = neighbours[aliveN];
        deadX = cell.x + n.x;
        deadY = cell.y + n.y;
        outerKey = this.getKey(deadX, deadY);

        if(!(outerKey in newCells)) {
          deadCellNeighbourCount = 0;
          for(var deadN in neighbours) {
            nk = neighbours[deadN];
            innerKey = this.getKey(deadX + nk.x, deadY + nk.y);

            if(innerKey in this.cells && this.cells[innerKey].alive) {
              deadCellNeighbourCount += 1;
            }

          }

          newCells[outerKey] = {
            x: deadX,
            y: deadY,
            alive: this.isAlive(false, deadCellNeighbourCount),
          }

        } else if(this.cells[outerKey] && this.cells[outerKey].alive) {
          aliveCellNeighbourCount += 1;
        }

      }

      newCells[this.getKey(cell.x, cell.y)].alive = this.isAlive(true, aliveCellNeighbourCount);
    }

    /* redraw with dead cell info still in so they are cleared off the screen */
    this.cells = newCells;
    this.redraw();

    var filtered = Object.keys(newCells).reduce(function (filtered, key) {
        if (newCells[key].alive) filtered[key] = newCells[key];
        return filtered;
    }, {});

    this.cells = filtered;

    this.latestPerformance = performance.now() - t0;
  }
}
