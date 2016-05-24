const FPS = 60;

// The number of pixels per frame that the global velocity will increase by
// when positive sentiment text messages are received.
//
// Units: Pixels per frame per net positive sentiment.
// I.E. Acceleration for positive sentiment text messages.
const VELOCITY_INTERVAL = 1;

// The velocity at which things will move at "hyperspeed"
const HYPERSPEED_VELOCITY = 25;

// The number of positive messages before velocity increases.
// If this is 20 then every 20 positive messages will increase the velocity.
const POSITIVE_MESSAGE_LIMIT = 25;

// The number of negative messages required to fire a laser.
const NEGATIVE_MESSAGE_LIMIT = 5;

const NUMBER_OF_STARS = 100;

const socket = io();
const randInt = (max) => {
    return Math.floor(Math.random() * max);
};

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');

let globalScreenWidth = $('#screen-container').width();
let globalScreenHeight = window.innerHeight - $('#callout').height();

// The number of pixels per frame that all non ship objects will move by.
let globalVelocity = 0;

// Number of positive messages since the last velocity increase.
let positiveMessages = 0;

// Number of negative messages since the last laser was fired.
let negativeMessages = 0;

// Number of frames since the fire animation switched.
let fireAnimationFrames = 0;

// 0 -> Normal
// 1 -> White stars become lines
// 2 -> rainbow stars
let stage = 0;

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

  // Helper functions for collision detection.
  left() {
    return this.x;
  }

  right() {
    return this.x + this.width;
  }

  upperBound() {
    return this.y;
  }

  lowerBound() {
    return this.y + this.height;
  }

  // Determines whether or not this element currently collides with another element.
  collidesWith(element) {

    let horizontalIntersection = (this.left() < element.right() && this.left > element.left()
                                  || this.right() > element.left() && this.right() < element.right());
    let verticalIntersection = (this.upperBound() < element.lowerBound() && this.upperBound() > element.upperBound()
                                  || this.lowerBound() > element.upperBound() && this.lowerBound() < element.lowerBound());

    if (horizontalIntersection && verticalIntersection) {
      return true;
    }

    return false;
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

    if (stage > 0) {
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

    if (stage === 1) {
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

class Laser extends Element {
  constructor() {
    const x = randInt(globalScreenWidth);
    super(x, 0, 0, 5, 5, 50);
    this.color = '#ff0000';
  }

  draw() {
    if (stage === 0) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}

class PhoneNumber extends Element {
  constructor(x, y, text) {
    // shipHeight because I am trying to line the gauge up with the ship vertically.
    super(x, y, 0, 0);
    this.text = text;
  }

  draw() {
    ctx.font = "24px serif";
    ctx.fillStyle = 'red';
    ctx.fillText(this.text, this.x, this.y);
  }

  move() {
    this.x -= 2;
  }
}

class Gauge extends Element {
  constructor(x, y, shipHeight) {
    // shipHeight because I am trying to line the gauge up with the ship vertically.
    super(x, y, 0, 0, 100, globalScreenHeight - shipHeight - y);
    this.color = '#ff0000';
  }

  draw() {
    if (stage === 0) {
      // How far up the rectangle will be drawn.
      let rectHeight = (globalVelocity/HYPERSPEED_VELOCITY) * this.height;

      // Draw the border.
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(this.x, this.y, this.width, this.height);

      // Draw the gauge.
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y + this.height, this.width, -rectHeight);
      ctx.fillStyle = '#000000';
    }
  }
}

let sky = new Sprite(0, 0, 0, 0, globalScreenWidth, globalScreenHeight - 100, 'http://img14.deviantart.net/ff6c/i/2012/009/1/a/sky_gradient_stock_by_nikhilmoh-d4lt15o.jpg');
let ground = new Element(0, sky.height, 0, 0, globalScreenWidth, globalScreenHeight - sky.height, '#CD853F');
let atmosphereStage1 = new Element(0, 0, 0, 0, globalScreenWidth, globalScreenHeight, ' #0000FF');
let ship = new Sprite(globalScreenWidth/2, sky.height - ground.height, 0, 0, 125, 125, 'http://i.imgur.com/TUZwV9i.png');
let fire = new Sprite(ship.x + 25, ship.y + 55, 0, 0, 75, 75, 'http://i.imgur.com/eGmVxAZ.png');
let gauge = new Gauge(7*globalScreenWidth/8, globalScreenHeight/6, ship.height);

let initializeStars = () => {
  // Generate randomly placed stars.
  let arr = [];

  for(let i = 0; i < NUMBER_OF_STARS; i += 1) {
    let randomHeight = randInt(globalScreenHeight);
    let star = new Star(randomHeight);

    arr.push(star);
  }

  return arr;
};

// All of the game elements on the screen.
let elements = initializeStars();

// The phone numbers who texted into the game
let numbers = [];

// Checks to see if all of the stars have reached the bottom of the screen
// during hyperspace. If so, we will reset the grid.
let allStarsAreAtTheBottom = () => {
  for (let element of elements) {
    if (element instanceof Star) {
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
  globalScreenHeight = window.innerHeight - $('#callout').height();

  if (stage === 0 && globalVelocity > HYPERSPEED_VELOCITY) {
    stage = 1;
    globalVelocity = 10;

    // Remove the gauge from the elements array.
    console.log('Removing gauge.');
    elements.splice(elements.length - 1, 1);

    // Set a marker for where each star was when hyperspeed was started.
    for (let element of elements) {
      if (element instanceof Star) {
        element.hyperspeedStart = element.y;
      }
    }
  }

  if (stage === 0 && globalVelocity > 0) {
    if (!elements.includes(fire)) {
      ship.y -= 75;
      elements.push(fire);
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all of the elements on the screen.
  for (let i = 0; i < elements.length; i += 1) {
    if (elements[i].y >= 0 && elements[i].y <= globalScreenHeight) {
      // elements[i] is currently on the screen so it can be moved.
      elements[i].move();
    } else if (stage === 1) {
      elements[i].move = function() {};

      if (allStarsAreAtTheBottom()) {
        elements = initializeStars();
        elements.push(ship);
        globalVelocity = 10;

        // Kick it into overdrive.
        stage = 2;
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

    elements[i].draw();
  }

  for (let number of numbers) {
    number.draw();
    number.move();
  }
};

// Listen for SMS events.
socket.on('sms', (data) => {
  let color = 'white';
  let sentiment = data.sentiment;
  let number = data.number.substr(0, data.number.length - 4) + 'xxxx';
  let emoji = '😐';

  console.log(data);

  if (stage > 0) {
    return;
  }

  // Positive messages increase the velocity. Negative messages fires a laser.
  if (sentiment === 'positive') {
    positiveMessages += 1;
    if (positiveMessages > POSITIVE_MESSAGE_LIMIT) {
      positiveMessages = 0;
      globalVelocity += VELOCITY_INTERVAL;
    }

    emoji = '😀 ';
  } else if (sentiment === 'negative') {
    negativeMessages += 1;
    if (negativeMessages > NEGATIVE_MESSAGE_LIMIT) {
      negativeMessages = 0;
      elements.push(new Laser());
    }

    emoji = '😭 ';
  }

  let x = globalScreenWidth;
  if (numbers.length > 0) {
    if (numbers[numbers.length - 1].x + 250 >= globalScreenWidth) {
      x = numbers[numbers.length - 1].x + 250;
    }
  }
  numbers.push(new PhoneNumber(x, 30, emoji + ' ' + number));


});

// Modify earth's move function to make it move like one of the stars.
// Why did I do this here? Because I needed it to work quickly.
// I didn't use () => {} because I don't want this to bind from the current scope.
sky.move = ground.move = function() {
  this.y += globalVelocity;
};

// sky.draw = function() {
//   // Going to draw a gradient of these colors in order from bottom to top.
//   // This is the "full" array. Experimenting with adding and removing some colors.
//   // let colors = ['#000033', '#00004c', '#000066', '#00007f', '#000099', '#0000b2', '#0000cc', '#0000e5', '#0000ff'];
//   let colors = ['#0000b2', '#0000cc', '#0000e5', '#0000ff'];
//   let currentHeight = this.y;
//
//   // The gradient will be made until we are a third away from the bottom, where the normal sky color will be drawn.
//   let maxHeight = this.height/3;
//   let heightInterval = maxHeight / colors.length;
//
//   for (let i = 0; i < colors.length - 1; i += 1) {
//     ctx.fillStyle = colors[i];
//     ctx.fillRect(this.x, currentHeight, this.width, currentHeight + heightInterval);
//     currentHeight += heightInterval;
//   }
//
//   ctx.fillStyle = colors[colors.length - 1];
//   ctx.fillRect(this.x, currentHeight, this.width, this.height);
// };

// Modify the ship's draw function to make it check for collisions with lasers.
ship.draw = function() {
  for (let element of elements) {

    // Check to see if the ship collides with a laser.
    if (element instanceof Laser) {
      if (element.collidesWith(this)) {
        let newImage = new Image();
        newImage.src = 'http://i.imgur.com/YufxX0I.png';
        ctx.drawImage(newImage, this.x, this.y, this.width, this.height);

        return;
      }
    }

  }

  ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
};

fire.toggleImage = function() {
  if (this.image.src === 'http://i.imgur.com/eGmVxAZ.png') {
    this.image.src = 'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAgMAAAAhHED1AAAADFBMVEX/o0f////4OAD///+CFYjfAAAABHRSTlP///8AQCqp9AAAAMFJREFUeJzt2EEKwzAMBEB/sp/sJ9O0uCCEE3zezF5CFO0cDfE4Zt5njpL6fvdtAACASGCcqQvvmTr77gAAgHxgVbrDAADAM4Cr/Erz4AEAAJnATrkiAAAgE/j/RNSsZisIAABkATvl1QwAAGQBfViXdw4VAACQC4yZXQgAAGQC4yJ3CAAAyAUq9DqzwgAAwDOAWuzPFQIAAHKAfiFZkZ4OLG80AQBAPNDLAAAgE+hIhWp6GQAAZAJXUE/fBwAAMcAHLQube95RSfoAAAAASUVORK5CYII=';
  } else {
    this.image.src = 'http://i.imgur.com/eGmVxAZ.png'
  }
};

fire.draw = function() {
  fireAnimationFrames += 1;
  if (fireAnimationFrames > 120) {
    this.toggleImage();
  }
  ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
};

// Push the new elements onto the array.
elements.push(sky);
elements.push(ground);
elements.push(ship);
elements.push(gauge);

// Run the game loop forever. FOREVER.
setInterval(gameLoop, 1000 / FPS);
