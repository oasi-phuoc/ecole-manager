const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'elevesController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

// Corriger getElevesOASI : oasi_encadrant → oasi_prog_encadrant
ctrl = ctrl.replace(
  `        e.oasi_prog_nom, e.oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,`,
  `        e.oasi_prog_nom, e.oasi_prog_encadrant as oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ getElevesOASI : oasi_prog_encadrant correctement mappé');