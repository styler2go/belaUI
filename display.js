const font = require("oled-font-pack").small_6x8;
const fontBig = require("oled-font-pack").small_8x12;
const i2c = require('i2c-bus');
const oled = require('oled-i2c-bus');
const i2cBus = i2c.openSync(1);

class Display {
  constructor(config, pipelines, netif, sensors, isStreaming) {
    this.ipAddressRotation = 0;
    this.displayOpts = {
      width: 128, height: 64, address: 0x3C
    };

    this.refreshData(config, pipelines, netif, sensors, isStreaming);
    this.init();
  }

  init() {
    this.display = new oled(i2cBus, this.displayOpts);
    setInterval(this.renderDisplay.bind(this), 2000);
  }

  writeLine(y, message) {
    this.display.setCursor(1, y);
    this.display.writeString(font, 1, message);
  }

  refreshData(config, pipelines, netif, sensors, isStreaming) {
    this.config = config;
    this.isStreaming = isStreaming;
    this.pipelines = pipelines;
    this.netif = netif;
    this.sensors = sensors;
    this.interfaces = Object.values(this.netif);
  }

  renderDisplay() {
    this.display.clearDisplay();

    let bitratesum = 0;
    this.interfaces.forEach(iface => {
      bitratesum += iface.tp;
    });

    let y = 0;
    this.display.setCursor(1, y);
    this.display.writeString(fontBig, 1, 'T ' + this.sensors['SoC temperature'].replace('°C', 'C'));
    y += 16;
    if (this.interfaces[this.ipAddressRotation]) {
      this.writeLine(y, 'IP ' + this.interfaces[this.ipAddressRotation].ip);
      y += 10;
    }

    let i = 0;
    this.interfaces.forEach(iface => {
      this.display.setCursor(1, y);
      this.writeLine(y, Object.keys(this.netif)[i] + ': ' + iface.tp / 1000 + ' kbps');
      y += 10;
      i++;
    });

    if (this.isStreaming) {
      this.display.setCursor(80, 0);
      this.display.writeString(fontBig, 1, 'LIVE');
    }

    if (this.pipelines[this.config.pipeline]) {
      y -= 1;
      const shortenedPipeLineName = this.pipelines[this.config.pipeline].name.split('/')[1];
      this.display.drawLine(1, y, this.displayOpts.width, y, 1);
      y += 3;
      this.display.setCursor(1, y);
      this.writeLine(y, shortenedPipeLineName.replace('h265_', '').replace('_', ' '));
    }

    // yellow line
    this.display.drawLine(0, 15, this.displayOpts.width, 15, 1);
    this.display.drawLine(0, 15, 0, 64, 1);
    this.display.drawLine(this.displayOpts.width - 1, 16, this.displayOpts.width - 1, 64, 1);
    this.display.drawLine(0, this.displayOpts.height - 1, this.displayOpts.width, this.displayOpts.height - 1, 1);

    if (this.ipAddressRotation === this.interfaces.length - 1) {
      this.ipAddressRotation = 0;
    } else {
      this.ipAddressRotation++;
    }
  }
}

module.exports = Display;