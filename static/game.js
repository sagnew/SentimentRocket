// The number of frames rendered per second.
const FPS = 60;

// The number of pixels per frame that the global velocity will increase by
// when positive sentiment text messages are received.
//
// Units: Pixels per frame per net positive sentiment.
// I.E. Acceleration for positive sentiment text messages.
const VELOCITY_INTERVAL = 5;

// The velocity at which things will move at "hyperspeed"
const HYPERSPEED_VELOCITY = 30;

const socket = io();
const randInt = (max) => {
    return Math.floor(Math.random() * max);
};

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');

let globalScreenWidth = $('#screen-container').width();
let globalScreenHeight = window.innerHeight;

// The number of pixels per frame that all non ship objects will move by.
let globalVelocity = 0;

// 0 -> Normal
// 1 -> White stars become lines
// 2 -> rainbow stars
let hyperspace = 0;

class Element {

  constructor(x, y, vx, vy, width, height, color) {
    // Current x position
    this.x = x;

    // Current x position
    this.y = y;

    // Current horizontal velocity
    this.vx = vx || 0;

    // Current vertical velocity
    this.vy = vy || 0;

    if (width !== undefined) {
      this.width = width;
    }

    if (height !== undefined) {
      this.height = height;
    }

    if (color !== undefined) {
      this.color = color;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  move() {
    this.x += this.vx;
    this.y += this.vy;
  }

}

class Sprite extends Element {
  constructor(x, y, vx, vy, width, height, src) {
    super(x, y, vx, vy, width, height);

    this.image = new Image();
    this.image.src = src;
  }

  draw() {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }
}

class Star extends Element {

  constructor(y) {
    const width = randInt(globalScreenWidth);
    super(width, y, 0, globalVelocity, 5, 5);
    this.colors = ['#FFFFFF', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#8a2be2'];

    if (hyperspace > 0) {
      this.color = this.colors[randInt(this.colors.length)];
    } else {
      this.color = '#FFFFFF'
    }
  }

  move() {
    this.y += globalVelocity;
  }

  draw() {
    let rectStart = this.y;
    let rectHeight = this.height;

    if (hyperspace === 1) {
      rectStart = this.hyperspeedStart;
      rectHeight = this.y - this.hyperspeedStart;

      if (allStarsAreAtTheBottom()) {
        this.color = this.colors[randInt(this.colors.length)];
      }
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, rectStart, this.width, rectHeight);
    ctx.fillStyle = '#000000';
  }
}

// let earth = new Sprite(ship.x - 75, ship.y + ship.height, 0, 0, 300, 300, 'http://makepixelart.com/peoplepods/files/images/8975.resized.png');
let sky = new Element(0, 0, 0, 0, globalScreenWidth, globalScreenHeight - 100, '#3399ff');
let ground = new Element(0, sky.height, 0, 0, globalScreenWidth, globalScreenHeight - sky.height, '#CD853F');
let atmosphereStage1 = new Element(0, 0, 0, 0, globalScreenWidth, globalScreenHeight, ' #0000FF');
let ship = new Sprite(globalScreenWidth/2, sky.height - ground.height, 0, 0, 125, 125, 'http://vignette1.wikia.nocookie.net/chickeninvaders/images/d/d7/Galaga_ship.png/revision/latest?cb=20150307025143');

let initializeStars = () => {
  // Generate randomly placed stars.
  let arr = [];

  for(let i = 0; i < 300; i += 1) {
    let randomHeight = randInt(globalScreenHeight);
    let star = new Star(randomHeight);

    arr.push(star);
  }

  return arr;
};

// All of the game elements on the screen.
let elements = initializeStars();

// Checks to see if all of the stars have reached the bottom of the screen
// during hyperspace. If so, we will reset the grid.
let allStarsAreAtTheBottom = () => {
  for (let element of elements) {
    if (element !== ship) {
      if (element.y < globalScreenHeight) {
        return false;
      }
    }
  }

  return true;
};

// Function to be executed for each frame.
let gameLoop = () => {
  canvas.height = globalScreenHeight;
  canvas.width = globalScreenWidth;

  globalScreenWidth = $('#screen-container').width();
  globalScreenHeight = window.innerHeight;

  if (hyperspace === 0 && globalVelocity > HYPERSPEED_VELOCITY) {
    hyperspace = 1;
    globalVelocity = 5;

    // Set a marker for where each star was when hyperspeed was started.
    for (let element of elements) {
      if (element !== ship) {
        element.hyperspeedStart = element.y;
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all of the elements on the screen.
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].image !== ship) {

      if (elements[i].y >= 0 && elements[i].y <= globalScreenHeight) {
        // elements[i] is currently on the screen so it can be moved.
        elements[i].move();
      } else if (hyperspace === 1) {
        elements[i].move = function() {};

        if (allStarsAreAtTheBottom()) {
          elements = initializeStars();
          elements.push(ship);
          globalVelocity = 10;

          // Kick it into overdrive.
          hyperspace = 2;
        }
      } else {

        // elements[i] is off the screen. Spawn a new star.
        let newPosition = 0;
        if (globalVelocity < 0) {
          newPosition = globalScreenHeight;
        }

        let newStar = new Star(newPosition);
        // if (isHyperspeed) {
        //   newStar.hyperspeedStart = 0;
        // }
        elements[i] = newStar;
      }

    }

    elements[i].draw();
  }
};

// Listen for SMS events.
socket.on('sms', (sentiment) => {
  console.log(sentiment);
  if (hyperspace > 0) {
    return;
  }

  // Happy messages increase the velocity. Negative messages decrease.
  if (sentiment === 'positive') {
    globalVelocity += VELOCITY_INTERVAL;
  } else if (sentiment === 'negative') {
    globalVelocity -= VELOCITY_INTERVAL;
    if (globalVelocity < 0) {
      globalVelocity = 0;
    }
  }
});

// Modify earth's move function to make it move like one of the stars.
// Why did I do this here? Because I needed it to work quickly.
sky.move = ground.move = function() {
  this.y += globalVelocity;
};

// Push the new elements onto the array.
elements.push(sky);
elements.push(ground);
elements.push(ship);

// Run the game loop forever. FOREVER.
setInterval(gameLoop, 1000 / FPS);
