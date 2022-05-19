const Display = require("./display");
//const gpio = require("jetson-gpio");

const display = new Display();

/**
gpio.on('change', function (channel, value) {
  console.log('Channel ' + channel + ' value is now ' + value);
});
gpio.setup(18, gpio.DIR_IN, gpio.EDGE_FALLING, done => {
  console.log(done);
});
 */