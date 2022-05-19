const font = require("oled-font-pack").small_6x8;
const fontBig = require("oled-font-pack").small_8x12;
const i2c = require('i2c-bus');
const oled = require('oled-i2c-bus');
const fs = require("fs");
const {execSync} = require('child_process');
const i2cBus = i2c.openSync(1);
const ifconfig = require("ifconfig-linux");

const CONFIG_FILE = 'config.json';
const TEMP_FILE = '/sys/class/thermal/thermal_zone0/temp';

class Display {
  constructor() {
    this.ipAddressRotation = 0;
    this.interfaces = {};
    this.displayOpts = {
      width: 128, height: 64, address: 0x3C
    };

    this.display = new oled(i2cBus, this.displayOpts);

    this.refreshData();
    this.renderDisplay();
    this.init();
  }

  init() {
    setInterval(this.refreshData.bind(this), 1000);
    setInterval(this.renderDisplay.bind(this), 2000);

  }

  writeLine(y, message) {
    this.display.setCursor(1, y);
    this.display.writeString(font, 1, message);
  }

  refreshData() {
    this.config = this.getConfig();
    this.sensors = this.getSensors();
    this.getInterfaces().then(() => {
    });
  }

  getConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }

  getPipelineName() {
    let path = this.config['pipeline_name'].split('/');

    return path[path.length - 1].replace('h265_', '').replace('_', ' ');
  }

  getSensors() {
    let socTemp = fs.readFileSync(TEMP_FILE, 'utf8');
    socTemp = parseInt(socTemp) / 1000.0;
    socTemp = `${socTemp.toFixed(1)} °C`;

    return {'socTemp': socTemp};
  }

  async getInterfaces() {
    let interfaces = await ifconfig();

    Object.keys(interfaces).forEach(ifaceName => {
      let iface = interfaces[ifaceName];
      if (iface.inet && iface.rx && ifaceName !== 'lo') {
        let rx = iface.rx.bytes;
        let tx = iface.tx.bytes;
        if (this.interfaces[ifaceName]) {
          rx -= this.interfaces[ifaceName].rx;
          tx -= this.interfaces[ifaceName].tx;
        }

        this.interfaces[ifaceName] = {
          iface: ifaceName,
          ip: iface.inet.addr,
          tx: tx,
          rx: rx,
          total: rx + tx
        }
      }
    });

    return this.interfaces;
  }

  isStreaming() {
    let process = execSync('ps -A').toString();

    return process.includes('belacoder');
  }

  renderDisplay() {
    this.display.clearDisplay();

    let y = 0;
    this.display.setCursor(1, y);
    this.display.writeString(font, 1, 'T ' + this.getSensors().socTemp);
    y += 10;

    Object.keys(this.interfaces).forEach(ifaceName => {
      let iface = this.interfaces[ifaceName];
      let totalSpeed = iface.total / 1000;

      this.writeLine(y, ifaceName + ': ' + Math.round(totalSpeed) + ' kbps');
      this.writeLine(y + 10, 'IP:' + iface.ip);

      y += 20;
    });

    if (this.isStreaming()) {
      this.display.setCursor(80, 0);
      this.display.writeString(fontBig, 1, 'LIVE');
    }

    if (this.config.hasOwnProperty('pipeline')) {
      y -= 1;
      this.display.drawLine(1, y, this.displayOpts.width, y, 1);
      y += 3;
      this.display.setCursor(1, y);
      this.writeLine(y, this.getPipelineName());
    }

    if (this.ipAddressRotation > Object.keys(this.interfaces).length - 1) {
      this.ipAddressRotation = 0;
    } else {
      this.ipAddressRotation++;
    }
  }
}

module.exports = Display;