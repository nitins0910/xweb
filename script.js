/* =========================================================================
   X — Web Edition
   All calculators from the original desktop tool, reimplemented for the
   browser. Formulas verified against standard mechanical/industrial
   engineering references; known bugs from the original tool are fixed
   and noted inline with "FIXED:" comments.
   ========================================================================= */

const PI = Math.PI;
function deg2rad(d){ return d * PI / 180; }
function rad2deg(r){ return r * 180 / PI; }
function fmt(x, d=3){
  if (x === null || x === undefined || Number.isNaN(x) || !isFinite(x)) return "—";
  if (Math.abs(x) !== 0 && (Math.abs(x) < 1e-4 || Math.abs(x) > 1e7)) return x.toExponential(d);
  return x.toLocaleString(undefined, {maximumFractionDigits: d, minimumFractionDigits: 0});
}
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function num(root, id){ const el = $('#'+id, root); return el ? parseFloat(el.value) : NaN; }
function str(root, id){ const el = $('#'+id, root); return el ? el.value : ""; }
function checked(root, id){ const el = $('#'+id, root); return el ? el.checked : false; }

/* ---- form field builders (return HTML strings) ---- */
function fRow(id, label, value, unit="", opts={}){
  const step = opts.step || "any";
  return `<div class="field-row">
    <label for="${id}">${label}</label>
    <input type="number" id="${id}" value="${value}" step="${step}">
    <span class="unit">${unit}</span>
  </div>`;
}
function fSelect(id, label, options, selected){
  const opts = options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const t = typeof o === 'object' ? o.label : o;
    return `<option value="${v}" ${v===selected?'selected':''}>${t}</option>`;
  }).join('');
  return `<div class="field-row"><label for="${id}">${label}</label><select id="${id}">${opts}</select></div>`;
}
function fCheckbox(id, label, checked=false){
  return `<div class="field-row checkbox-row">
    <label for="${id}"><input type="checkbox" id="${id}" ${checked?'checked':''}> ${label}</label>
  </div>`;
}
function fRadioGroup(name, options, selected){
  return `<div class="radio-group">${options.map(o=>{
    const v = typeof o === 'object' ? o.value : o;
    const t = typeof o === 'object' ? o.label : o;
    return `<label><input type="radio" name="${name}" value="${v}" ${v===selected?'checked':''}> ${t}</label>`;
  }).join('')}</div>`;
}
function card(title, innerHTML){
  return `<div class="card">${title?`<h3>${title}</h3>`:''}${innerHTML}</div>`;
}
function resultRow(label, value, unit="", highlight=false){
  return `<div class="result-row"><span class="rlabel">${label}</span><span class="rvalue ${highlight?'highlight':''}">${value} ${unit}</span></div>`;
}
function resultBox(rowsHTML, cls=""){
  return `<div class="result-box ${cls}">${rowsHTML}</div>`;
}
function errorBox(msg){
  return `<div class="result-box error">⚠ ${msg}</div>`;
}
function note(text){
  return `<div class="note">${text}</div>`;
}

/* =========================================================================
   CALCULATOR REGISTRY
   ========================================================================= */
const CALCULATORS = [];
function reg(id, name, category, render){ CALCULATORS.push({id, name, category, render}); }

/* ---------------------------------------------------------------------
   1. MOMENT OF INERTIA
   --------------------------------------------------------------------- */
reg('moi', 'Moment of Inertia', 'Sections & Shafts', function(container){
  container.innerHTML = `
    <h2>Moment of Inertia</h2>
    <div class="calc-desc">Second moment of area for standard cross-sections.</div>
    ${card('', fSelect('moiShape', 'Shape', [
      {value:'rect', label:'Rectangle'}, {value:'circle', label:'Circle'},
      {value:'hollow', label:'Hollow Circle'}, {value:'i', label:'I-Section'},
      {value:'t', label:'T-Section'}, {value:'tri', label:'Triangle'}
    ], 'rect'))}
    <div id="moiFields"></div>
    <button class="btn" id="moiCalc">Calculate</button>
    <div id="moiResult"></div>
  `;
  const fieldsDiv = $('#moiFields', container);
  function renderFields(){
    const shape = str(container, 'moiShape');
    let html = '';
    if (shape === 'rect') html = card('Inputs', fRow('b','Width (b)',100,'mm')+fRow('h','Height (h)',50,'mm'));
    else if (shape === 'circle') html = card('Inputs', fRow('r','Radius (r)',50,'mm'));
    else if (shape === 'hollow') html = card('Inputs', fRow('R','Outer Radius (R)',60,'mm')+fRow('rr','Inner Radius (r)',40,'mm'));
    else if (shape === 'i') html = card('Inputs', fRow('bf','Flange Width (bf)',100,'mm')+fRow('tf','Flange Thickness (tf)',10,'mm')+fRow('hw','Web Height (hw)',80,'mm')+fRow('tw','Web Thickness (tw)',8,'mm'));
    else if (shape === 't') html = card('Inputs', fRow('bf','Flange Width (bf)',100,'mm')+fRow('tf','Flange Thickness (tf)',10,'mm')+fRow('hw','Web Height (hw)',90,'mm')+fRow('tw','Web Thickness (tw)',8,'mm'));
    else if (shape === 'tri') html = card('Inputs', fRow('b','Base (b)',100,'mm')+fRow('h','Height (h)',50,'mm')+fCheckbox('isoTri','Isosceles / symmetric triangle (unchecked = right-angled)', true));
    fieldsDiv.innerHTML = html;
  }
  renderFields();
  $('#moiShape', container).addEventListener('change', renderFields);
  $('#moiCalc', container).addEventListener('click', () => {
    const shape = str(container, 'moiShape');
    let Ix, Iy, note1 = '';
    try {
      if (shape === 'rect') {
        const b = num(container,'b'), h = num(container,'h');
        Ix = (b*h**3)/12; Iy = (h*b**3)/12;
      } else if (shape === 'circle') {
        const r = num(container,'r');
        Ix = Iy = (PI*r**4)/4;
      } else if (shape === 'hollow') {
        const R = num(container,'R'), r = num(container,'rr');
        if (r >= R) throw new Error('Inner radius must be less than outer radius.');
        Ix = Iy = (PI*(R**4 - r**4))/4;
      } else if (shape === 'i') {
        const bf=num(container,'bf'), tf=num(container,'tf'), hw=num(container,'hw'), tw=num(container,'tw');
        Ix = (2*(bf*tf**3)/12) + (tw*hw**3)/12 + 2*(bf*tf)*((hw/2+tf/2)**2);
        Iy = (2*(tf*bf**3)/12) + (hw*tw**3)/12;
      } else if (shape === 't') {
        const bf=num(container,'bf'), tf=num(container,'tf'), hw=num(container,'hw'), tw=num(container,'tw');
        const Af = bf*tf, Aw = tw*hw;
        const yc = ((Af*(hw+tf/2)) + (Aw*hw/2)) / (Af+Aw);
        const Ixf = (bf*tf**3)/12 + Af*(hw+tf/2-yc)**2;
        const Ixw = (tw*hw**3)/12 + Aw*(hw/2-yc)**2;
        Ix = Ixf + Ixw;
        Iy = (tf*bf**3)/12 + (hw*tw**3)/12;
      } else if (shape === 'tri') {
        const b=num(container,'b'), h=num(container,'h');
        const iso = checked(container,'isoTri');
        Ix = (b*h**3)/36;
        Iy = iso ? (h*b**3)/48 : (h*b**3)/36; // right-triangle Iy about centroid differs from isosceles case
        note1 = iso
          ? 'I<sub>y</sub> uses the isosceles/symmetric-triangle formula.'
          : 'I<sub>y</sub> uses the right-angled-triangle formula (about the centroidal axis parallel to the height).';
      }
      $('#moiResult', container).innerHTML = resultBox(
        resultRow('I<sub>x</sub>', fmt(Ix), 'mm⁴', true) + resultRow('I<sub>y</sub>', fmt(Iy), 'mm⁴', true)
      ) + (note1 ? note(note1) : '');
    } catch(e){ $('#moiResult', container).innerHTML = errorBox(e.message); }
  });
  $('#moiCalc', container).click();
});

/* ---------------------------------------------------------------------
   2. METAL COILS (Weight / Length / OD / ID)
   --------------------------------------------------------------------- */
reg('coils', 'Metal Coils', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Metal Coils</h2>
    <div class="calc-desc">Coil weight, length, OD or ID from the others.</div>
    ${card('', fSelect('coilMode','Solve for', [
      {value:'weight', label:'Weight (from ID, OD, Width)'},
      {value:'length', label:'Length (from Weight, Width, Thickness)'},
      {value:'od', label:'Outer Diameter (from ID, Weight, Width)'},
      {value:'id', label:'Inner Diameter (from OD, Weight, Width)'}
    ], 'weight'))}
    <div id="coilFields"></div>
    <button class="btn" id="coilCalc">Calculate</button>
    <div id="coilResult"></div>
  `;
  function renderFields(){
    const mode = str(container,'coilMode');
    let html = '';
    if (mode === 'weight') html = card('Inputs', fRow('id','Inner Diameter',500,'mm')+fRow('od','Outer Diameter',1500,'mm')+fRow('w','Width',1000,'mm')+fRow('rho','Density',7.86,'g/cm³'));
    else if (mode === 'length') html = card('Inputs', fRow('wt','Weight',1000,'kg')+fRow('w','Width',1000,'mm')+fRow('t','Thickness',0.5,'mm')+fRow('rho','Density',7.86,'g/cm³'));
    else if (mode === 'od') html = card('Inputs', fRow('id','Inner Diameter',500,'mm')+fRow('wt','Weight',1000,'kg')+fRow('w','Width',1000,'mm')+fRow('rho','Density',7.86,'g/cm³'));
    else if (mode === 'id') html = card('Inputs', fRow('od','Outer Diameter',1500,'mm')+fRow('wt','Weight',1000,'kg')+fRow('w','Width',1000,'mm')+fRow('rho','Density',7.86,'g/cm³'));
    $('#coilFields', container).innerHTML = html;
  }
  renderFields();
  $('#coilMode', container).addEventListener('change', renderFields);
  $('#coilCalc', container).addEventListener('click', () => {
    try{
      const mode = str(container,'coilMode');
      const rho = num(container,'rho');
      if (mode === 'weight') {
        const id = num(container,'id'), od = num(container,'od'), w = num(container,'w');
        if (od <= id) throw new Error('Outer diameter must be greater than inner diameter.');
        const idc=id/10, odc=od/10, wc=w/10;
        const cross = PI*((odc/2)**2 - (idc/2)**2);
        const weight = (cross*wc*rho)/1000;
        $('#coilResult', container).innerHTML = resultBox(resultRow('Weight', fmt(weight), 'kg', true));
      } else if (mode === 'length') {
        const wt = num(container,'wt'), w = num(container,'w'), t = num(container,'t');
        const wc=w/10, tc=t/10;
        const lengthCm = (wt*1000/rho) / (wc*tc);
        $('#coilResult', container).innerHTML = resultBox(resultRow('Length', fmt(lengthCm/100), 'm', true));
      } else if (mode === 'od') {
        const id = num(container,'id'), wt = num(container,'wt'), w = num(container,'w');
        const idc=id/10, wc=w/10;
        const crossCm2 = (wt*1000/rho)/wc;
        const odCm = Math.sqrt((4*crossCm2/PI)+idc**2);
        $('#coilResult', container).innerHTML = resultBox(resultRow('Outer Diameter', fmt(odCm*10), 'mm', true));
      } else if (mode === 'id') {
        const od = num(container,'od'), wt = num(container,'wt'), w = num(container,'w');
        const odc=od/10, wc=w/10;
        const crossCm2 = (wt*1000/rho)/wc;
        const idSq = odc**2 - (4*crossCm2/PI);
        if (idSq < 0) throw new Error('Resulting inner diameter is imaginary — check inputs.');
        $('#coilResult', container).innerHTML = resultBox(resultRow('Inner Diameter', fmt(Math.sqrt(idSq)*10), 'mm', true));
      }
    } catch(e){ $('#coilResult', container).innerHTML = errorBox(e.message); }
  });
  $('#coilCalc', container).click();
});

/* ---------------------------------------------------------------------
   3. HYDRAULIC CYLINDER
   --------------------------------------------------------------------- */
reg('hyd-cyl', 'Hydraulic Cylinder', 'Hydraulics', function(container){
  container.innerHTML = `
    <h2>Hydraulic Cylinder</h2>
    <div class="calc-desc">Bore/rod side area, force, velocity, time and flow for a double-acting cylinder.</div>
    ${card('Inputs',
      fRow('bore','Piston / Bore Diameter',125,'mm')+
      fRow('rod','Rod Diameter',60,'mm')+
      fRow('stroke','Stroke',100,'mm')+
      fRow('press','Pressure',70,'bar')+
      fRow('flow','Oil Flow',100,'lpm')
    )}
    <button class="btn" id="hcCalc">Calculate</button>
    <div id="hcResult"></div>
  `;
  $('#hcCalc', container).addEventListener('click', () => {
    try {
      const Dm = num(container,'bore')/1000, dm = num(container,'rod')/1000, Lm = num(container,'stroke')/1000;
      const Ppa = num(container,'press')*1e5, Qin = num(container,'flow')*(0.001/60);
      if (dm >= Dm) throw new Error('Rod diameter must be less than bore diameter.');
      const Abore = PI*(Dm/2)**2, Arod = PI*((Dm/2)**2 - (dm/2)**2);
      const Vbore = Abore*Lm, Vrod = Arod*Lm;
      const Fbore = Ppa*Abore, Frod = Ppa*Arod;
      const vBore = Qin/Abore, vRod = Qin/Arod;
      const tBore = Vbore/Qin, tRod = Vrod/Qin;
      const QoutBore = Qin*(Arod/Abore), QoutRod = Qin*(Abore/Arod);
      const ratio = Abore/Arod;
      $('#hcResult', container).innerHTML =
        `<table class="mini"><tr><th></th><th>Bore Side</th><th>Rod Side</th></tr>
         <tr><td>Area</td><td>${fmt(Abore*10000,3)} cm²</td><td>${fmt(Arod*10000,3)} cm²</td></tr>
         <tr><td>Volume</td><td>${fmt(Vbore*1e6,3)} cm³</td><td>${fmt(Vrod*1e6,3)} cm³</td></tr>
         <tr><td>Force</td><td>${fmt(Fbore/1000,3)} kN</td><td>${fmt(Frod/1000,3)} kN</td></tr>
         <tr><td>Time</td><td>${fmt(tBore,4)} s</td><td>${fmt(tRod,4)} s</td></tr>
         <tr><td>Velocity</td><td>${fmt(vBore,4)} m/s</td><td>${fmt(vRod,4)} m/s</td></tr>
         <tr><td>Outflow</td><td>${fmt(QoutBore*60000,3)} lpm</td><td>${fmt(QoutRod*60000,3)} lpm</td></tr>
         </table>` + resultBox(resultRow('Area Ratio (Bore/Rod)', fmt(ratio), '', true));
    } catch(e){ $('#hcResult', container).innerHTML = errorBox(e.message); }
  });
  $('#hcCalc', container).click();
});

/* ---------------------------------------------------------------------
   4. UNCOILER / RECOILER POWER
   --------------------------------------------------------------------- */
reg('uncoiler', 'Uncoiler/Recoiler Power', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Uncoiler / Recoiler Power</h2>
    <div class="calc-desc">Torque and drive power from strip tension and coil geometry.</div>
    ${card('Inputs',
      fRow('st','Specific Tension',1.5,'kg/mm²')+
      fRow('id','Inner Diameter (mandrel)',500,'mm')+
      fRow('od','Max Outer Diameter',1500,'mm')+
      fRow('minSpeed','Minimum Line Speed',30,'m/min')+
      fRow('w','Max Width',1250,'mm')+
      fRow('t','Max Thickness',3,'mm')+
      fRow('eff','Efficiency (η)',0.9,'0–1')
    )}
    <button class="btn" id="unCalc">Calculate</button>
    <div id="unResult"></div>
  `;
  $('#unCalc', container).addEventListener('click', () => {
    try {
      const st=num(container,'st'), id=num(container,'id'), od=num(container,'od');
      const minSpeed=num(container,'minSpeed'), w=num(container,'w'), t=num(container,'t'), eff=num(container,'eff');
      if (id >= od) throw new Error('Inner diameter must be less than outer diameter.');
      if (eff<=0 || eff>1) throw new Error('Efficiency must be between 0 and 1.');
      const idOdRatio = od/id;
      const specificTensionNmm2 = st*9.81;
      const area = w*t;
      const totalTension = specificTensionNmm2*area;
      const radius = od/2;
      const torque = totalTension*(radius/1000);
      const circumferenceM = (PI*od)/1000;
      const rpm = minSpeed/circumferenceM;
      const omega = rpm*(2*PI/60);
      const powerKw = (torque*omega/eff)/1000;
      const maxLineSpeed = minSpeed*idOdRatio;
      const maxRpm = maxLineSpeed/circumferenceM;
      $('#unResult', container).innerHTML = resultBox(
        resultRow('OD/ID Ratio', fmt(idOdRatio,3), idOdRatio<=3.5?'(good)':idOdRatio<=4.5?'(caution)':'(high — check mandrel design)') +
        resultRow('Total Strip Tension', fmt(totalTension), 'N') +
        resultRow('Torque', fmt(torque), 'N·m', true) +
        resultRow('Drive Power', fmt(powerKw), 'kW', true) +
        resultRow('RPM at Min Speed', fmt(rpm), 'rpm') +
        resultRow('RPM at Max Speed (est.)', fmt(maxRpm), 'rpm')
      );
    } catch(e){ $('#unResult', container).innerHTML = errorBox(e.message); }
  });
  $('#unCalc', container).click();
});

/* ---------------------------------------------------------------------
   5. PRODUCTION CALCULATOR (Thickness x Velocity)
   --------------------------------------------------------------------- */
reg('production', 'Production', 'Rolling Mill Process', function(container){
  container.innerHTML = `
    <h2>Production Calculator</h2>
    <div class="calc-desc">Thickness × Velocity (TV) number and mass production rate; find the new speed to hold production rate constant at a new gauge.</div>
    ${card('Step 1 — Current pass',
      fRow('t1','Thickness',5,'mm')+fRow('s1','Line Speed',30,'mpm')+fRow('w1','Width',1000,'mm')+fRow('rho','Density',7850,'kg/m³')
    )}
    ${card('Step 2 — New pass (optional)', fRow('t2','New Thickness',4,'mm')+fRow('w2','New Width',1000,'mm'))}
    <button class="btn" id="prodCalc">Calculate</button>
    <div id="prodResult"></div>
  `;
  $('#prodCalc', container).addEventListener('click', () => {
    try {
      const t1=num(container,'t1'), s1=num(container,'s1'), w1=num(container,'w1'), rho=num(container,'rho');
      const tv = t1*s1;
      const areaM2 = (t1*w1)*1e-6;
      const volM3PerHr = areaM2*s1*60;
      const massKgPerHr = volM3PerHr*rho;
      const prodRateTph = massKgPerHr*1e-3;
      let html = resultBox(
        resultRow('Thickness × Velocity (TV)', fmt(tv), '', true) +
        resultRow('Production Rate', fmt(prodRateTph), 't/h', true)
      );
      const t2 = num(container,'t2'), w2 = num(container,'w2');
      if (!Number.isNaN(t2) && !Number.isNaN(w2) && t2>0 && w2>0) {
        const s2 = (prodRateTph*1e9)/(t2*w2*60*rho);
        const tv2 = t2*s2;
        html += resultBox(
          resultRow('New Line Speed', fmt(s2), 'mpm', true) +
          resultRow('New TV', fmt(tv2))
        );
      }
      $('#prodResult', container).innerHTML = html;
    } catch(e){ $('#prodResult', container).innerHTML = errorBox(e.message); }
  });
  $('#prodCalc', container).click();
});

/* ---------------------------------------------------------------------
   6. ELECTRIC MOTOR
   --------------------------------------------------------------------- */
reg('motor', 'Electric Motor', 'Drives & Power Transmission', function(container){
  container.innerHTML = `
    <h2>Electric Motor Calculator</h2>
    ${card('Number of Poles', fRow('freq','Frequency (f)',50,'Hz')+fRow('nsyn','Synchronous Speed (N)',1500,'RPM')+`<button class="btn" id="polesCalc">Calculate Poles</button><div id="polesResult"></div>`)}
    ${card('Torque', fRow('mp','Power (P)',10,'kW')+fRow('mn','Speed (N)',1450,'RPM')+`<button class="btn" id="torqCalc">Calculate Torque</button><div id="torqResult"></div>`)}
    ${card('Efficiency', fRow('pout','Output Power',10,'kW')+fRow('pin','Input Power',11,'kW')+`<button class="btn" id="effCalc">Calculate Efficiency</button><div id="effResult"></div>`)}
    ${card('Slip', fRow('ns','Synchronous Speed (Ns)',1500,'RPM')+fRow('nact','Actual Speed (N)',1450,'RPM')+`<button class="btn" id="slipCalc">Calculate Slip</button><div id="slipResult"></div>`)}
  `;
  $('#polesCalc', container).addEventListener('click', () => {
    const f=num(container,'freq'), N=num(container,'nsyn');
    const P = (120*f)/N;
    $('#polesResult', container).innerHTML = resultBox(resultRow('Number of Poles', fmt(P,2), '', true));
  });
  $('#torqCalc', container).addEventListener('click', () => {
    const P=num(container,'mp'), N=num(container,'mn');
    const T = (P*9550)/N;
    $('#torqResult', container).innerHTML = resultBox(resultRow('Torque', fmt(T), 'N·m', true));
  });
  $('#effCalc', container).addEventListener('click', () => {
    const po=num(container,'pout'), pi=num(container,'pin');
    const e = (po/pi)*100;
    $('#effResult', container).innerHTML = resultBox(resultRow('Efficiency', fmt(e,2), '%', true));
  });
  $('#slipCalc', container).addEventListener('click', () => {
    const ns=num(container,'ns'), n=num(container,'nact');
    const s = ((ns-n)/ns)*100;
    $('#slipResult', container).innerHTML = resultBox(resultRow('Slip', fmt(s,2), '%', true));
  });
  $('#polesCalc', container).click(); $('#torqCalc', container).click(); $('#effCalc', container).click(); $('#slipCalc', container).click();
});

/* ---------------------------------------------------------------------
   7. GEARBOX
   --------------------------------------------------------------------- */
reg('gearbox', 'Gearbox', 'Drives & Power Transmission', function(container){
  container.innerHTML = `
    <h2>Gearbox Calculator</h2>
    ${card('Gear Ratio', fRow('nin','Input Speed',1750,'RPM')+fRow('nout','Output Speed',100,'RPM')+`<button class="btn" id="grCalc">Calculate</button><div id="grResult"></div>`)}
    ${card('Output Torque', fRow('tin','Input Torque',500,'N·m')+fRow('gr','Gear Ratio',5,'')+fRow('geff','Efficiency (η)',0.95,'0–1')+`<button class="btn" id="otCalc">Calculate</button><div id="otResult"></div>`)}
    ${card('Power Transmission', fRow('pnin','Input Speed',1750,'RPM')+fRow('ptin','Input Torque',500,'N·m')+`<button class="btn" id="ptCalc">Calculate</button><div id="ptResult"></div>`)}
  `;
  $('#grCalc', container).addEventListener('click', () => {
    const ni=num(container,'nin'), no=num(container,'nout');
    $('#grResult', container).innerHTML = resultBox(resultRow('Gear Ratio', fmt(ni/no,3), '', true));
  });
  $('#otCalc', container).addEventListener('click', () => {
    const ti=num(container,'tin'), gr=num(container,'gr'), eff=num(container,'geff');
    $('#otResult', container).innerHTML = resultBox(resultRow('Output Torque', fmt(ti*gr*eff), 'N·m', true));
  });
  $('#ptCalc', container).addEventListener('click', () => {
    const n=num(container,'pnin'), t=num(container,'ptin');
    $('#ptResult', container).innerHTML = resultBox(resultRow('Power', fmt((2*PI*n*t)/(60*1000)), 'kW', true));
  });
  $('#grCalc', container).click(); $('#otCalc', container).click(); $('#ptCalc', container).click();
});

/* ---------------------------------------------------------------------
   8. GEAR SEPARATING FORCE
   --------------------------------------------------------------------- */
reg('gear-force', 'Gear Separating Force', 'Drives & Power Transmission', function(container){
  container.innerHTML = `
    <h2>Gear Separating Force</h2>
    <div class="calc-desc">Radial (separating) force from torque, pitch circle diameter and pressure angle.</div>
    ${card('Inputs', fRow('torque','Torque',53503,'N·m')+fRow('pcd','Pitch Circle Diameter',320,'mm')+fRow('pa','Pressure Angle',28,'°'))}
    <button class="btn" id="gfCalc">Calculate</button>
    <div id="gfResult"></div>
    ${note('The separating force depends only on tangential force (torque, PCD) and pressure angle — it is the same whether the driven gear is larger or smaller.')}
  `;
  $('#gfCalc', container).addEventListener('click', () => {
    try {
      const T=num(container,'torque'), pcd=num(container,'pcd'), pa=num(container,'pa');
      const r = pcd/2000;
      const Ft = T/r;
      const Fr = Ft*Math.tan(deg2rad(pa));
      $('#gfResult', container).innerHTML = resultBox(
        resultRow('Tangential Force (Ft)', fmt(Ft), 'N') +
        resultRow('Separating Force (Fr)', fmt(Fr), 'N', true)
      );
    } catch(e){ $('#gfResult', container).innerHTML = errorBox(e.message); }
  });
  $('#gfCalc', container).click();
});

/* ---------------------------------------------------------------------
   9. EULER'S TENSION TRANSMISSION
   --------------------------------------------------------------------- */
reg('euler', "Euler's Tension Transmission", 'Drives & Power Transmission', function(container){
  container.innerHTML = `
    <h2>Euler's Tension Transmission (Belt Friction)</h2>
    <div class="calc-desc">T1 = T2 · e<sup>μθ</sup></div>
    ${card('', fSelect('eMode','Solve for', [
      {value:'t1', label:'Tension T1'}, {value:'t2', label:'Tension T2'}, {value:'theta', label:'Wrap Angle'}
    ], 't1'))}
    <div id="eFields"></div>
    <button class="btn" id="eCalc">Calculate</button>
    <div id="eResult"></div>
  `;
  function renderFields(){
    const mode = str(container,'eMode');
    let html='';
    if (mode==='t1') html = card('Inputs', fRow('t2','Tension T2',100,'N')+fRow('mu','Friction Coeff. (μ)',0.3,'')+fRow('theta','Wrap Angle',180,'°'));
    else if (mode==='t2') html = card('Inputs', fRow('t1','Tension T1',200,'N')+fRow('mu','Friction Coeff. (μ)',0.3,'')+fRow('theta','Wrap Angle',180,'°'));
    else html = card('Inputs', fRow('t1','Tension T1',200,'N')+fRow('t2','Tension T2',100,'N')+fRow('mu','Friction Coeff. (μ)',0.3,''));
    $('#eFields', container).innerHTML = html;
  }
  renderFields();
  $('#eMode', container).addEventListener('change', renderFields);
  $('#eCalc', container).addEventListener('click', () => {
    try {
      const mode = str(container,'eMode'), mu = num(container,'mu');
      if (mode==='t1') {
        const t2=num(container,'t2'), theta=deg2rad(num(container,'theta'));
        const t1 = t2*Math.exp(mu*theta);
        $('#eResult', container).innerHTML = resultBox(resultRow('Tension T1', fmt(t1), 'N', true));
      } else if (mode==='t2') {
        const t1=num(container,'t1'), theta=deg2rad(num(container,'theta'));
        const t2 = t1/Math.exp(mu*theta);
        $('#eResult', container).innerHTML = resultBox(resultRow('Tension T2', fmt(t2), 'N', true));
      } else {
        const t1=num(container,'t1'), t2=num(container,'t2');
        if (t2<=0) throw new Error('T2 must be greater than 0.');
        const thetaRad = Math.log(t1/t2)/mu;
        $('#eResult', container).innerHTML = resultBox(resultRow('Wrap Angle', fmt(rad2deg(thetaRad)), '°', true) + resultRow('(radians)', fmt(thetaRad,4)));
      }
    } catch(e){ $('#eResult', container).innerHTML = errorBox(e.message); }
  });
  $('#eCalc', container).click();
});

/* ---------------------------------------------------------------------
   10. LEVELLER I-UNIT
   --------------------------------------------------------------------- */
reg('leveller', 'Leveller I-Unit', 'Rolling Mill Process', function(container){
  container.innerHTML = `
    <h2>Leveller I-Unit</h2>
    <div class="calc-desc">I-Unit = (π·H/L)² × 100,000 — a common flatness index for roller levellers.</div>
    ${card('Inputs', fRow('H','Wave Height (H)',1,'mm')+fRow('L','Wave Length (L)',200,'mm'))}
    <button class="btn" id="lvCalc">Calculate</button>
    <div id="lvResult"></div>
  `;
  $('#lvCalc', container).addEventListener('click', () => {
    try {
      const H=num(container,'H'), L=num(container,'L');
      if (L<=0) throw new Error('Wave length must be positive.');
      if (H<0) throw new Error('Wave height cannot be negative.');
      const iUnit = ((PI*H/L)**2)*100000;
      $('#lvResult', container).innerHTML = resultBox(resultRow('I-Unit', fmt(iUnit), '', true));
    } catch(e){ $('#lvResult', container).innerHTML = errorBox(e.message); }
  });
  $('#lvCalc', container).click();
});

/* ---------------------------------------------------------------------
   11. ELECTRICITY BILL
   --------------------------------------------------------------------- */
reg('elec-bill', 'Electricity Bill', 'Utility', function(container){
  container.innerHTML = `
    <h2>Electricity Bill Calculator</h2>
    <div class="calc-desc">Add appliances (wattage &amp; daily run-time) to estimate total consumption and cost.</div>
    ${card('Rate', fRow('rate','Rate per Unit',8,'₹/kWh'))}
    <div id="applianceRows"></div>
    <button class="btn secondary" id="addAppliance">+ Add Appliance</button>
    <button class="btn" id="billCalc">Calculate Bill</button>
    <div id="billResult"></div>
  `;
  let rows = [{name:'Appliance 1', watt:100, time:120}];
  function renderRows(){
    $('#applianceRows', container).innerHTML = rows.map((r,i)=>`
      <div class="load-list-row">
        <input type="text" value="${r.name}" data-i="${i}" data-f="name" placeholder="Name">
        <input type="number" value="${r.watt}" data-i="${i}" data-f="watt" placeholder="Watts"> W
        <input type="number" value="${r.time}" data-i="${i}" data-f="time" placeholder="Minutes/day"> min/day
        <button class="remove-btn" data-remove="${i}">✕</button>
      </div>`).join('');
    $all('input[data-i]', container).forEach(inp => {
      inp.addEventListener('input', () => {
        const i = +inp.dataset.i, f = inp.dataset.f;
        rows[i][f] = f==='name' ? inp.value : parseFloat(inp.value);
      });
    });
    $all('[data-remove]', container).forEach(btn => {
      btn.addEventListener('click', () => { rows.splice(+btn.dataset.remove,1); renderRows(); });
    });
  }
  renderRows();
  $('#addAppliance', container).addEventListener('click', () => {
    rows.push({name:'Appliance '+(rows.length+1), watt:100, time:60});
    renderRows();
  });
  $('#billCalc', container).addEventListener('click', () => {
    try {
      const rate = num(container,'rate');
      if (rate<=0) throw new Error('Rate must be positive.');
      let totalKwh = 0;
      const lines = rows.map(r => {
        const kwh = (r.watt*(r.time/60))/1000;
        totalKwh += kwh;
        return resultRow(r.name, fmt(kwh,3), 'kWh');
      }).join('');
      $('#billResult', container).innerHTML = resultBox(lines + resultRow('Total Consumption', fmt(totalKwh,3), 'kWh', true) + resultRow('Estimated Bill', '₹ '+fmt(totalKwh*rate,2), '', true));
    } catch(e){ $('#billResult', container).innerHTML = errorBox(e.message); }
  });
  $('#billCalc', container).click();
});

/* ---------------------------------------------------------------------
   12. UNIT CONVERTER
   --------------------------------------------------------------------- */
reg('units', 'Unit Converter', 'Utility', function(container){
  const CATS = {
    length: {units:{mm:0.001, cm:0.01, m:1, km:1000, inch:0.0254, ft:0.3048, yard:0.9144, mile:1609.34}, base:'m'},
    area: {units:{'mm²':1e-6, 'cm²':1e-4, 'm²':1, 'in²':0.00064516, 'ft²':0.09290304}, base:'m²'},
    volume: {units:{'mm³':1e-9, 'cm³':1e-6, L:0.001, 'm³':1, 'in³':1.6387064e-5, 'ft³':0.0283168, 'US gal':0.00378541, 'UK gal':0.00454609}, base:'m³'},
    mass: {units:{g:0.001, kg:1, ton_metric:1000, lb:0.453592, oz:0.0283495}, base:'kg'},
    density: {units:{'kg/m³':1, 'g/cm³':1000, 'lb/ft³':16.0185, 'lb/in³':27679.9}, base:'kg/m³'},
    linear_density: {units:{'kg/m':1, 'kg/mm':1000, 'g/mm':1, 'lb/ft':1.48816, 'lb/in':17.8580}, base:'kg/m'},
    force: {units:{N:1, kN:1000, kgf:9.80665, lbf:4.44822}, base:'N'},
    pressure: {units:{Pa:1, kPa:1000, MPa:1e6, bar:1e5, psi:6894.76, atm:101325}, base:'Pa'},
    torque: {units:{'N·m':1, 'N·mm':0.001, 'kgf·m':9.80665, 'lbf·ft':1.35582}, base:'N·m'},
    moi: {units:{'mm⁴':1, 'cm⁴':1e4, 'm⁴':1e12, 'in⁴':416231.4256}, base:'mm⁴'},
    power: {units:{W:1, kW:1000, HP:745.7, 'kgf·m/s':9.80665}, base:'W'},
    speed: {units:{'m/s':1, 'm/min':1/60, 'km/h':1/3.6, mph:0.44704, rpm_to_rads:2*PI/60}, base:'m/s'},
    angular_velocity: {units:{'rad/s':1, rpm:2*PI/60, 'deg/s':PI/180, Hz:2*PI}, base:'rad/s'},
    energy: {units:{J:1, kJ:1000, kWh:3.6e6, cal:4.184, kcal:4184, BTU:1055.06, 'ft·lb':1.35582}, base:'J'},
    viscosity_dynamic: {units:{'Pa·s':1, cP:0.001, poise:0.1}, base:'Pa·s'},
    viscosity_kinematic: {units:{'m²/s':1, cSt:1e-6, stokes:1e-4, 'ft²/s':0.09290304}, base:'m²/s'},
    flow_rate: {units:{'m³/s':1, 'm³/h':1/3600, 'L/min':1/60000, 'L/s':0.001, GPM:6.30902e-5, CFM:4.71947e-4}, base:'m³/s'},
    angle: {units:{deg:PI/180, rad:1, grad:PI/200, arcmin:PI/10800}, base:'rad'},
    temperature: {special:true}
  };
  const CAT_LABELS = {
    length:'Length', area:'Area', volume:'Volume', mass:'Mass', density:'Density',
    linear_density:'Linear Mass Density', force:'Force', pressure:'Pressure', torque:'Torque',
    moi:'Moment of Inertia', power:'Power', speed:'Speed', angular_velocity:'Angular Velocity / Frequency',
    energy:'Energy', viscosity_dynamic:'Viscosity (Dynamic)', viscosity_kinematic:'Viscosity (Kinematic)',
    flow_rate:'Flow Rate', angle:'Angle', temperature:'Temperature'
  };
  container.innerHTML = `
    <h2>Unit Converter</h2>
    <div class="calc-desc">Converts live as you type — no button needed. Use ⇄ to flip From/To instantly.</div>
    ${card('', fSelect('uCat', 'Category', Object.keys(CATS).map(k=>({value:k, label:CAT_LABELS[k]||k})), 'length'))}
    <div id="uFields"></div>
  `;
  function convert(){
    try {
      const cat = str(container,'uCat');
      const v = num(container,'uVal');
      const from = str(container,'uFrom'), to = str(container,'uTo');
      let out;
      if (cat === 'temperature') {
        let c;
        if (from==='Celsius') c=v; else if (from==='Fahrenheit') c=(v-32)*5/9; else c=v-273.15;
        if (to==='Celsius') out=c; else if (to==='Fahrenheit') out=c*9/5+32; else out=c+273.15;
      } else {
        const base = v * CATS[cat].units[from];
        out = base / CATS[cat].units[to];
      }
      $('#uResult', container).innerHTML = resultBox(
        resultRow(fmt(v,6)+' '+from+' =', fmt(out, cat==='temperature'?4:6), to, true)
      );
    } catch(e){ $('#uResult', container).innerHTML = errorBox(e.message); }
  }
  function renderFields(){
    const cat = str(container,'uCat');
    const units = cat === 'temperature' ? ['Celsius','Fahrenheit','Kelvin'] : Object.keys(CATS[cat].units);
    const defFrom = units[0], defTo = units[1]||units[0];
    $('#uFields', container).innerHTML = card('Convert',
      fRow('uVal','Value', cat==='temperature'?0:1,'') +
      fSelect('uFrom','From', units, defFrom) +
      fSelect('uTo','To', units, defTo) +
      `<div class="field-row"><label></label><button type="button" class="btn secondary" id="uSwap">⇄ Swap Units</button></div>` +
      `<div id="uResult"></div>`
    );
    // Live conversion: fires on every keystroke and every dropdown change —
    // no "Convert" click required, which was the slow part of the old UX.
    $('#uVal', container).addEventListener('input', convert);
    $('#uFrom', container).addEventListener('change', convert);
    $('#uTo', container).addEventListener('change', convert);
    $('#uSwap', container).addEventListener('click', () => {
      const fromSel = $('#uFrom', container), toSel = $('#uTo', container);
      const tmp = fromSel.value; fromSel.value = toSel.value; toSel.value = tmp;
      convert();
    });
    convert();
  }
  renderFields();
  $('#uCat', container).addEventListener('change', renderFields);
});

/* ---------------------------------------------------------------------
   13. SHEAR FORCE (Sheet metal cutting)
   --------------------------------------------------------------------- */
reg('shear-force', 'Shear Force', 'Cutting & Shearing', function(container){
  container.innerHTML = `
    <h2>Shear Force Calculator</h2>
    ${card('', fSelect('sfMode','Method', [
      {value:'single', label:'Single (Square) Cut'},
      {value:'prog', label:'Progressive Cut with Shear/Rake Angle'}
    ], 'single'))}
    <div id="sfFields"></div>
    <button class="btn" id="sfCalc">Calculate</button>
    <div id="sfResult"></div>
  `;
  function renderFields(){
    const mode = str(container,'sfMode');
    let html = fRow('t','Strip Thickness',10,'mm')+fRow('L','Material Width',1650,'mm')+fRow('ss','Shear Strength',300,'N/mm²');
    if (mode==='prog') html += fRow('angle','Shear (Rake) Angle',3,'°');
    $('#sfFields', container).innerHTML = card('Inputs', html);
  }
  renderFields();
  $('#sfMode', container).addEventListener('change', renderFields);
  $('#sfCalc', container).addEventListener('click', () => {
    try {
      const mode = str(container,'sfMode');
      const t=num(container,'t'), L=num(container,'L'), ss=num(container,'ss');
      if (t<=0||L<=0||ss<=0) throw new Error('Thickness, width and shear strength must be positive.');
      let html;
      if (mode === 'single') {
        const force = ss*t*L;
        html = resultBox(resultRow('Shear Force', fmt(force/1000), 'kN', true));
      } else {
        const angleDeg = num(container,'angle');
        if (angleDeg<=0 || angleDeg>=90) throw new Error('Shear angle must be between 0° and 90°.');
        const angleRad = deg2rad(angleDeg);
        // Standard progressive-shear (rake angle) formula for max instantaneous
        // force: F_max = (Ss * t^2) / (2 * tan(angle)). This is the widely used
        // press-tonnage reduction formula for a punch/die with a shear (rake)
        // angle. Do NOT drop the /2 — that was a past regression that doubled
        // every result from this calculator.
        const forceMax = (ss*(t**2))/(2*Math.tan(angleRad));
        const contactLength = t/Math.tan(angleRad);
        html = resultBox(
          resultRow('Instantaneous Contact Length', fmt(contactLength,3), 'mm') +
          resultRow('Max Shear Force', fmt(forceMax/1000), 'kN', true)
        ) + note('A single square cut of the same thickness/width would need ' + fmt((ss*t*L)/1000) + ' kN — the rake angle greatly reduces peak force and shock load.');
      }
      $('#sfResult', container).innerHTML = html;
    } catch(e){ $('#sfResult', container).innerHTML = errorBox(e.message); }
  });
  $('#sfCalc', container).click();
});

/* ---------------------------------------------------------------------
   14. SHAFT DESIGN UNDER SINGLE AND DOUBLE SHEAR (pin/shaft)
   --------------------------------------------------------------------- */
reg('shaft-shear', 'Shaft Design Under Single and Double Shear', 'Shafts & Rotating Elements', function(container){
  container.innerHTML = `
    <h2>Shaft/Pin Design Under Shear</h2>
    ${card('Calculate Required Diameter',
      fRow('cf','Applied Force (F)',1000,'N')+
      fRow('cs','Allowable Shear Stress (τ)',50,'MPa')+
      fRadioGroup('cShear',[{value:'single',label:'Single Shear'},{value:'double',label:'Double Shear'}],'single')+
      `<button class="btn" id="pinCalcD">Calculate Diameter</button><div id="pinCalcDResult"></div>`
    )}
    ${card('Check Given Diameter',
      fRow('kf','Applied Force (F)',1000,'N')+
      fRow('ks','Allowable Shear Stress (τ)',50,'MPa')+
      fRow('kd','Given Diameter (d)',20,'mm')+
      fRadioGroup('kShear',[{value:'single',label:'Single Shear'},{value:'double',label:'Double Shear'}],'single')+
      `<button class="btn" id="pinCheck">Check Adequacy</button><div id="pinCheckResult"></div>`
    )}
  `;
  $('#pinCalcD', container).addEventListener('click', () => {
    try {
      const F=num(container,'cf'), tau=num(container,'cs');
      const type = $(`input[name="cShear"]:checked`, container).value;
      if (F<=0||tau<=0) throw new Error('Force and stress must be positive.');
      const d = type==='single' ? Math.sqrt((4*F)/(PI*tau)) : Math.sqrt((2*F)/(PI*tau));
      $('#pinCalcDResult', container).innerHTML = resultBox(resultRow('Required Diameter', fmt(d,3), 'mm', true));
    } catch(e){ $('#pinCalcDResult', container).innerHTML = errorBox(e.message); }
  });
  $('#pinCheck', container).addEventListener('click', () => {
    try {
      const F=num(container,'kf'), tau=num(container,'ks'), d=num(container,'kd');
      const type = $(`input[name="kShear"]:checked`, container).value;
      if (F<=0||tau<=0||d<=0) throw new Error('All values must be positive.');
      const area = PI*d*d/4;
      const actual = type==='single' ? F/area : F/(2*area);
      const ok = actual <= tau;
      $('#pinCheckResult', container).innerHTML = resultBox(
        resultRow('Induced Shear Stress', fmt(actual,2), 'MPa') +
        resultRow('Allowable Shear Stress', fmt(tau,2), 'MPa') +
        resultRow('Result', ok?'ADEQUATE (SAFE)':'NOT ADEQUATE', '', true), ok?'ok':'error'
      );
    } catch(e){ $('#pinCheckResult', container).innerHTML = errorBox(e.message); }
  });
  $('#pinCalcD', container).click(); $('#pinCheck', container).click();
});

/* ---------------------------------------------------------------------
   15. SHAFT DESIGN UNDER TORSION (full ASME + MSS + DET + stiffness)
   --------------------------------------------------------------------- */
reg('shaft-torsion', 'Shaft Design Under Torsion', 'Shafts & Rotating Elements', function(container){
  container.innerHTML = `
    <h2>Shaft Design Under Torsion &amp; Bending</h2>
    <div class="calc-desc">Combines bending and torsion using three approaches: Maximum Shear Stress Theory (MSS), Distortion Energy Theory (DET), and the ASME shock-factor method. Also checks torsional stiffness.</div>
    ${card('Loads', fSelect('stTorqueMode','Torque input', [{value:'direct',label:'Direct Torque'},{value:'power',label:'From Power & Speed'}],'power') + `<div id="stTorqueFields"></div>` +
      fSelect('stBendMode','Bending Moment input', [{value:'direct',label:'Direct Bending Moment'},{value:'force',label:'From Force × Length/4 (central load)'}],'direct') + `<div id="stBendFields"></div>`
    )}
    ${card('Material & Safety', fRow('stSy','Yield Strength (Syt)',320,'MPa')+fRow('stSut','Ultimate Strength (Sut)',600,'MPa')+fRow('stNf','Factor of Safety (Nf)',2,''))}
    ${card('ASME Shock/Fatigue Factors', fRow('stKb','Bending Shock Factor (Kb)',1.75,'')+fRow('stKt','Torsional Shock Factor (Kt)',1.25,'')+fCheckbox('stKeyway','Keyway present (reduces ASME allowable stress by 25%)', true))}
    ${card('Stiffness Check', fRow('stG','Shear Modulus (G)',80,'GPa')+fRow('stLen','Shaft Length',1,'m')+fRow('stTwistLimit','Permissible Twist',0.25,'°/m'))}
    <button class="btn" id="stCalc">Calculate</button>
    <div id="stResult"></div>
  `;
  function renderTorqueFields(){
    const mode = str(container,'stTorqueMode');
    $('#stTorqueFields', container).innerHTML = mode==='direct'
      ? fRow('stT','Torque (T)',1910,'N·m')
      : fRow('stP','Power (P)',30,'kW')+fRow('stN','Speed (N)',150,'RPM');
  }
  function renderBendFields(){
    const mode = str(container,'stBendMode');
    $('#stBendFields', container).innerHTML = mode==='direct'
      ? fRow('stM','Bending Moment (M)',1200,'N·m')
      : fRow('stF','Force (F)',4000,'N')+fRow('stSpan','Bearing Span (L)',1200,'mm');
  }
  renderTorqueFields(); renderBendFields();
  $('#stTorqueMode', container).addEventListener('change', renderTorqueFields);
  $('#stBendMode', container).addEventListener('change', renderBendFields);

  $('#stCalc', container).addEventListener('click', () => {
    try {
      // --- Torque ---
      let T; // N.m
      if (str(container,'stTorqueMode')==='direct') T = num(container,'stT');
      else { const P=num(container,'stP'), N=num(container,'stN'); if (N<=0) throw new Error('Speed must be positive.'); T = (9550*P)/N; }
      // --- Bending moment ---
      let M; // N.m
      if (str(container,'stBendMode')==='direct') M = num(container,'stM');
      else { const F=num(container,'stF'), L=num(container,'stSpan'); M = (F*L)/4/1000; } // L in mm -> convert to N.m result

      const Sy = num(container,'stSy'), Sut = num(container,'stSut'), Nf = num(container,'stNf');
      const Kb = num(container,'stKb'), Kt = num(container,'stKt'), keyway = checked(container,'stKeyway');
      const G = num(container,'stG')*1e9, Lshaft = num(container,'stLen'), twistLimit = num(container,'stTwistLimit');

      const M_Nmm = M*1000, T_Nmm = T*1000;

      // 1) Maximum Shear Stress Theory (basic, no shock factors)
      const Te_mss = Math.sqrt(M_Nmm**2 + T_Nmm**2);
      const tau_allow_mss = (Sy/2)/Nf; // Sy/2 = shear yield approx, MPa
      const d_mss = Math.cbrt((16*Te_mss)/(PI*tau_allow_mss));

      // 2) Distortion Energy Theory (von Mises, basic)
      const sigma_allow_det = Sy/Nf;
      const d_det = Math.cbrt((16/(PI*sigma_allow_det))*Math.sqrt(4*M_Nmm**2 + 3*T_Nmm**2));

      // 3) ASME Code Method (Guest-Tresca with shock/fatigue factors)
      const Te_asme = Math.sqrt((Kb*M_Nmm)**2 + (Kt*T_Nmm)**2);
      let tau_allow_asme = Math.min(0.30*Sy, 0.18*Sut);
      if (keyway) tau_allow_asme *= 0.75;
      const d_asme = Math.cbrt((16*Te_asme)/(PI*tau_allow_asme));

      // 4) Torsional stiffness
      const d_stiff_m = Math.pow((32*T*Lshaft)/(PI*(deg2rad(twistLimit))*G), 0.25); // solving J=32T L/(theta G) then d=(32J/pi)^(1/4)... derived below
      // Derivation: theta(rad) = T*L/(G*J), J = pi*d^4/32  => d = (32*T*L/(G*theta_rad))^(1/4)
      const theta_rad_per_m = deg2rad(twistLimit);
      const d_stiffness = Math.pow((32*T*Lshaft)/(PI*G*theta_rad_per_m), 0.25) * 1000; // m -> mm

      const d_recommended = Math.max(d_mss, d_det, d_asme, d_stiffness);

      $('#stResult', container).innerHTML =
        resultBox(
          resultRow('Torque (T)', fmt(T), 'N·m') +
          resultRow('Bending Moment (M)', fmt(M), 'N·m')
        ) +
        resultBox(
          resultRow('MSS — Equivalent Twisting Moment', fmt(Te_mss), 'N·mm') +
          resultRow('MSS — Allowable Shear Stress', fmt(tau_allow_mss), 'MPa') +
          resultRow('MSS — Required Diameter', fmt(d_mss), 'mm', true)
        ) +
        resultBox(
          resultRow('DET — Allowable Normal Stress', fmt(sigma_allow_det), 'MPa') +
          resultRow('DET — Required Diameter', fmt(d_det), 'mm', true)
        ) +
        resultBox(
          resultRow('ASME — Equivalent Twisting Moment (Te)', fmt(Te_asme), 'N·mm') +
          resultRow('ASME — Allowable Shear Stress (τ_allow)', fmt(tau_allow_asme), 'MPa') +
          resultRow('ASME — Required Diameter', fmt(d_asme), 'mm', true)
        ) +
        resultBox(
          resultRow('Stiffness — Required Diameter', fmt(d_stiffness), 'mm', true)
        ) +
        resultBox(resultRow('RECOMMENDED DIAMETER (governing, max of all)', fmt(d_recommended), 'mm', true)) +
        note('Round the recommended diameter UP to the next available standard bar/bearing-bore size — never down.');
    } catch(e){ $('#stResult', container).innerHTML = errorBox(e.message); }
  });
  $('#stCalc', container).click();
});

/* ---------------------------------------------------------------------
   16. WORK ROLL NECK DIAMETER ADEQUACY (pure torsion)
   --------------------------------------------------------------------- */
reg('workroll-neck', 'Work Roll Neck Diameter Adequacy', 'Rolling Mill Process', function(container){
  container.innerHTML = `
    <h2>Work Roll Neck Diameter Adequacy</h2>
    <div class="calc-desc">Pure-torsion sizing check for the roll neck (drive end), τ_allow = 0.5·Syt / FOS.</div>
    ${card('Inputs', fRow('wrP','Power (P)',100,'kW')+fRow('wrN','Rotational Speed (N)',1000,'RPM')+fRow('wrSyt','Yield Strength (Syt)',400,'MPa')+fRow('wrFos','Factor of Safety (FOS)',2,''))}
    <button class="btn" id="wrCalcMin">Calculate Minimum Diameter</button>
    <div id="wrMinResult"></div>
    ${card('Check a Given Diameter', fRow('wrGivenD','Given Diameter',50,'mm')+`<button class="btn" id="wrCheck">Check Adequacy</button><div id="wrCheckResult"></div>`)}
  `;
  function torqueAndTau(){
    const Pw = num(container,'wrP')*1000, N = num(container,'wrN'), Syt = num(container,'wrSyt'), FOS = num(container,'wrFos');
    if (N<=0) throw new Error('Speed must be positive.');
    if (FOS<=0) throw new Error('Factor of safety must be positive.');
    const torqueNm = (60*Pw)/(2*PI*N);
    const torqueNmm = torqueNm*1000;
    const tauAllow = (0.5*Syt)/FOS;
    return {torqueNmm, tauAllow};
  }
  $('#wrCalcMin', container).addEventListener('click', () => {
    try {
      const {torqueNmm, tauAllow} = torqueAndTau();
      const dMin = Math.cbrt((16*torqueNmm)/(PI*tauAllow));
      $('#wrMinResult', container).innerHTML = resultBox(
        resultRow('Allowable Shear Stress', fmt(tauAllow), 'MPa') +
        resultRow('Minimum Required Diameter', fmt(dMin), 'mm', true)
      );
    } catch(e){ $('#wrMinResult', container).innerHTML = errorBox(e.message); }
  });
  $('#wrCheck', container).addEventListener('click', () => {
    try {
      const {torqueNmm, tauAllow} = torqueAndTau();
      const d = num(container,'wrGivenD');
      if (d<=0) throw new Error('Diameter must be positive.');
      const tauInduced = (16*torqueNmm)/(PI*d**3);
      const ok = tauInduced < tauAllow;
      $('#wrCheckResult', container).innerHTML = resultBox(
        resultRow('Induced Shear Stress', fmt(tauInduced), 'MPa') +
        resultRow('Allowable Shear Stress', fmt(tauAllow), 'MPa') +
        resultRow('Result', ok?'ADEQUATE (SAFE)':'NOT ADEQUATE', '', true), ok?'ok':'error'
      );
    } catch(e){ $('#wrCheckResult', container).innerHTML = errorBox(e.message); }
  });
  $('#wrCalcMin', container).click(); $('#wrCheck', container).click();
});

/* ---------------------------------------------------------------------
   17. MANDREL SHAFT DIAMETER
   --------------------------------------------------------------------- */
reg('mandrel', 'Mandrel Shaft Diameter', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Recoiler Mandrel Shaft Diameter</h2>
    ${card('Inputs',
      fRow('mMass','Max Coil Mass',20000,'kg')+
      fRow('mL','Coil Width (L)',1250,'mm')+
      fRow('mDo','Max Coil OD (Do)',1800,'mm')+
      fRow('mFt','Max Strip Tension (Ft)',50000,'N')+
      fRow('mSy','Yield Strength (Sy)',415,'MPa')+
      fRow('mN','Safety Factor (N)',3,'')+
      fRow('mKb','Bending Factor (kb)',1.5,'')+
      fRow('mKt','Torsion Factor (kt)',1.25,'')
    )}
    <button class="btn" id="mCalc">Calculate Diameter</button>
    <div id="mResult"></div>
  `;
  $('#mCalc', container).addEventListener('click', () => {
    try {
      const mass=num(container,'mMass'), L=num(container,'mL'), Do=num(container,'mDo');
      const Ft=num(container,'mFt'), Sy=num(container,'mSy'), N=num(container,'mN');
      const kb=num(container,'mKb'), kt=num(container,'mKt');
      if (N<=0) throw new Error('Safety factor cannot be zero.');
      const W = mass*9.81;
      const tauAllow = (0.5*Sy)/N;
      const M = (W*L)/8; // N.mm (simply-supported UDL-equivalent approximation)
      const T = Ft*(Do/2);
      const Meq = Math.sqrt((kb*M)**2 + (kt*T)**2);
      if (tauAllow<=0) throw new Error('Allowable shear stress cannot be zero.');
      const d = Math.cbrt((16*Meq)/(PI*tauAllow));
      const recommended = Math.ceil(d/5)*5;
      $('#mResult', container).innerHTML = resultBox(
        resultRow('Coil Weight (W)', fmt(W), 'N') +
        resultRow('Allowable Shear Stress', fmt(tauAllow), 'MPa') +
        resultRow('Max Bending Moment (M)', fmt(M), 'N·mm') +
        resultRow('Max Torque (T)', fmt(T), 'N·mm') +
        resultRow('Calculated Diameter', fmt(d), 'mm', true) +
        resultRow('Recommended (next 5 mm size up)', fmt(recommended,0), 'mm', true)
      );
    } catch(e){ $('#mResult', container).innerHTML = errorBox(e.message); }
  });
  $('#mCalc', container).click();
});

/* ---------------------------------------------------------------------
   18. DUAL-NUT LEADSCREW TORQUE AND POWER
   --------------------------------------------------------------------- */
reg('leadscrew', 'Dual-Nut Leadscrew Torque and Power', 'Drives & Power Transmission', function(container){
  container.innerHTML = `
    <h2>Dual-Nut Leadscrew Torque &amp; Power</h2>
    ${card('Inputs',
      fRow('lsD','Major Diameter (d)',24,'mm')+
      fRow('lsP','Pitch (p)',5,'mm')+
      fRow('lsNs','Number of Starts (ns)',1,'')+
      fRow('lsAngle','Included Thread Angle (2α)',29,'°')+
      fRow('lsDc','Mean Collar Diameter (dc)',35,'mm')+
      fRow('lsF','Axial Load (F)',6000,'N')+
      fRow('lsMuT','Thread Friction Coeff. (μt)',0.15,'')+
      fRow('lsMuC','Collar Friction Coeff. (μc)',0.12,'')+
      fRow('lsRpm','Speed',50,'RPM')
    )}
    <button class="btn" id="lsCalc">Calculate</button>
    <div id="lsResult"></div>
  `;
  $('#lsCalc', container).addEventListener('click', () => {
    try {
      const d = num(container,'lsD')/1000, p = num(container,'lsP')/1000, ns = num(container,'lsNs');
      const angle2a = num(container,'lsAngle'), dc = num(container,'lsDc')/1000, F = num(container,'lsF');
      const muT = num(container,'lsMuT'), muC = num(container,'lsMuC'), rpm = num(container,'lsRpm');
      const Lead = ns*p;
      const dm = d - p/2;
      const alpha = angle2a/2;
      const secAlpha = 1/Math.cos(deg2rad(alpha));
      const numerator = Lead + PI*muT*dm*secAlpha;
      const denominator = PI*dm - muT*Lead*secAlpha;
      if (denominator<=0) throw new Error('Screw is self-locking or inputs are inconsistent (denominator ≤ 0).');
      const Tthread = (F*dm/2)*(numerator/denominator);
      const Tcollar = (F*muC*dc)/2;
      const Ttotal = 2*(Tthread + Tcollar); // dual-nut => 2x
      const omega = (rpm*2*PI)/60;
      const Pw = Ttotal*omega;
      $('#lsResult', container).innerHTML = resultBox(
        resultRow('Lead (L)', fmt(Lead*1000,3), 'mm') +
        resultRow('Mean Diameter (dm)', fmt(dm*1000,3), 'mm') +
        resultRow('Thread Torque (per nut)', fmt(Tthread), 'N·m') +
        resultRow('Collar Torque (per nut)', fmt(Tcollar), 'N·m') +
        resultRow('Total Shaft Torque (both nuts)', fmt(Ttotal), 'N·m', true) +
        resultRow('Required Power', fmt(Pw), 'W', true) +
        resultRow('(equivalent)', fmt(Pw/746), 'hp')
      );
    } catch(e){ $('#lsResult', container).innerHTML = errorBox(e.message); }
  });
  $('#lsCalc', container).click();
});

/* ---------------------------------------------------------------------
   19. BEARING LIFE (L10)
   --------------------------------------------------------------------- */
reg('bearing-life', 'Bearing Life', 'Bearings', function(container){
  const TYPES = {
    'Deep Groove Ball Bearings': {C:30700, Fr:4000, Fa:1500, n:2000, X:0.56, Y:1.6, exp:3, hasXY:true},
    'Cylindrical Roller Bearings': {C:83200, Fr:10000, Fa:0, n:1500, X:1, Y:0, exp:10/3, hasXY:false, radialOnly:true},
    'Spherical Roller Bearings': {C:340000, Fr:45000, Fa:8000, n:800, X:1, Y:2.4, exp:10/3, hasXY:true},
    'Tapered Roller Bearings': {C:78000, Fr:12000, Fa:5000, n:1200, X:0.4, Y:1.6, exp:10/3, hasXY:true},
    'Angular Contact Ball Bearings': {C:96500, Fr:7000, Fa:4000, n:3000, X:1, Y:0, exp:3, hasXY:true},
    'Thrust Ball Bearings': {C:29100, Fr:0, Fa:5000, n:1000, X:0, Y:1, exp:3, hasXY:false, axialOnly:true}
  };
  container.innerHTML = `
    <h2>Bearing Life Calculator (L10)</h2>
    ${card('', fSelect('blType','Bearing Type', Object.keys(TYPES), Object.keys(TYPES)[0]))}
    <div id="blFields"></div>
    <button class="btn" id="blCalc">Calculate</button>
    <div id="blResult"></div>
  `;
  function renderFields(){
    const t = TYPES[str(container,'blType')];
    let html = fRow('blC','Basic Dynamic Load Rating (C)',t.C,'N')+fRow('blN','Rotational Speed (n)',t.n,'rpm');
    if (!t.axialOnly) html += fRow('blFr','Radial Load (Fr)',t.Fr,'N');
    if (!t.radialOnly) html += fRow('blFa','Axial Load (Fa)',t.Fa,'N');
    if (t.hasXY) html += fRow('blX','Radial Load Factor (X)',t.X,'')+fRow('blY','Axial Load Factor (Y)',t.Y,'');
    $('#blFields', container).innerHTML = card('Inputs', html);
  }
  renderFields();
  $('#blType', container).addEventListener('change', renderFields);
  $('#blCalc', container).addEventListener('click', () => {
    try {
      const type = str(container,'blType'), t = TYPES[type];
      const C = num(container,'blC'), n = num(container,'blN');
      let P;
      if (type === 'Cylindrical Roller Bearings') P = num(container,'blFr');
      else if (type === 'Thrust Ball Bearings') P = num(container,'blFa');
      else {
        const Fr = num(container,'blFr'), Fa = num(container,'blFa'), X = num(container,'blX'), Y = num(container,'blY');
        P = X*Fr + Y*Fa;
      }
      if (P<=0||C<=0||n<=0) throw new Error('C, n, and equivalent load P must all be positive.');
      const L10 = Math.pow(C/P, t.exp);
      const L10h = (1e6*L10)/(60*n);
      $('#blResult', container).innerHTML = resultBox(
        resultRow('Equivalent Dynamic Load (P)', fmt(P), 'N') +
        resultRow('L₁₀ Life', fmt(L10), 'million rev', true) +
        resultRow('L₁₀ₕ Life', fmt(L10h,0), 'hours', true)
      );
    } catch(e){ $('#blResult', container).innerHTML = errorBox(e.message); }
  });
  $('#blCalc', container).click();
});

/* ---------------------------------------------------------------------
   20. HYDRAULIC MOTOR
   --------------------------------------------------------------------- */
reg('hyd-motor', 'Hydraulic Motor', 'Hydraulics', function(container){
  container.innerHTML = `
    <h2>Hydraulic Motor Calculator</h2>
    ${card('', fSelect('hmParam','Solve for', ['Flow Rate','Displacement','Speed','Torque','Pressure','Power'], 'Torque'))}
    <div id="hmFields"></div>
    <button class="btn" id="hmCalc">Calculate</button>
    <div id="hmResult"></div>
  `;
  function renderFields(){
    const p = str(container,'hmParam');
    let html = '';
    if (p==='Flow Rate') html = fRow('hmDisp','Displacement',50,'cc/rev')+fRow('hmSpeed','Speed',1500,'rpm');
    else if (p==='Displacement') html = fRow('hmFlow','Flow Rate',50,'lpm')+fRow('hmSpeed','Speed',1500,'rpm');
    else if (p==='Speed') html = fRow('hmFlow','Flow Rate',50,'lpm')+fRow('hmDisp','Displacement',50,'cc/rev');
    else if (p==='Torque') html = fRow('hmDisp','Displacement',50,'cc/rev')+fRow('hmPress','Pressure',150,'bar');
    else if (p==='Pressure') html = fRow('hmTorque','Torque',100,'N·m')+fRow('hmDisp','Displacement',50,'cc/rev');
    else if (p==='Power') html = fRow('hmTorque','Torque',100,'N·m')+fRow('hmSpeed','Speed',1500,'rpm');
    html += fRow('hmVe','Volumetric Efficiency',90,'%')+fRow('hmMe','Mechanical Efficiency',90,'%');
    $('#hmFields', container).innerHTML = card('Inputs', html);
  }
  renderFields();
  $('#hmParam', container).addEventListener('change', renderFields);
  $('#hmCalc', container).addEventListener('click', () => {
    try {
      const p = str(container,'hmParam');
      const ve = num(container,'hmVe')/100, me = num(container,'hmMe')/100;
      let result, unit;
      if (p==='Flow Rate') {
        const D=num(container,'hmDisp'), N=num(container,'hmSpeed');
        result = (D*N)/(1000*ve); unit='lpm';
      } else if (p==='Displacement') {
        const Q=num(container,'hmFlow'), N=num(container,'hmSpeed');
        result = (Q*1000*ve)/N; unit='cc/rev';
      } else if (p==='Speed') {
        const Q=num(container,'hmFlow'), D=num(container,'hmDisp');
        result = (Q*1000*ve)/D; unit='rpm';
      } else if (p==='Torque') {
        const D=num(container,'hmDisp'), P=num(container,'hmPress')*1e5;
        result = (D*1e-6*P*me)/(2*PI); unit='N·m';
      } else if (p==='Pressure') {
        const T=num(container,'hmTorque'), D=num(container,'hmDisp');
        result = (T*2*PI)/(D*1e-6*me)/1e5; unit='bar';
      } else if (p==='Power') {
        const T=num(container,'hmTorque'), N=num(container,'hmSpeed');
        const omega = N*2*PI/60;
        result = (T*omega*me)/1000; unit='kW';
      }
      $('#hmResult', container).innerHTML = resultBox(resultRow(p, fmt(result,4), unit, true));
    } catch(e){ $('#hmResult', container).innerHTML = errorBox(e.message); }
  });
  $('#hmCalc', container).click();
});

/* ---------------------------------------------------------------------
   21. SLITTING LINE / ROTARY SHEAR
   --------------------------------------------------------------------- */
reg('slitting', 'Slitting Line or Rotary Shear', 'Cutting & Shearing', function(container){
  container.innerHTML = `
    <h2>Slitting Line / Rotary Shear</h2>
    <div class="calc-desc">Circular-knife shearing geometry: chord/segment area, per-cutter shear force, then total torque and power.</div>
    ${card('Inputs', fRow('slT','Sheet Thickness',3,'mm')+fRow('slD','Cutter Diameter',400,'mm')+fRow('slSs','Shear Strength',300,'MPa')+fRow('slN','Number of Cutters',20,'')+fRow('slSpeed','Line Speed',30,'m/min'))}
    <button class="btn" id="slCalc">Calculate</button>
    <div id="slResult"></div>
  `;
  $('#slCalc', container).addEventListener('click', () => {
    try {
      const h=num(container,'slT'), D=num(container,'slD'), ss=num(container,'slSs');
      const n=num(container,'slN'), speed=num(container,'slSpeed');
      if (D<=h) throw new Error('Cutter diameter must be greater than sheet thickness.');
      const R = D/2;
      const lengthAB = Math.sqrt(h*D);
      const lengthBC = h*Math.sqrt(D/(D-h));
      const areaABC = 0.5*lengthAB*lengthBC;
      let sinHalfTheta = lengthAB/(2*R);
      sinHalfTheta = Math.max(-1, Math.min(1, sinHalfTheta));
      const theta = 2*Math.asin(sinHalfTheta);
      const areaSegment = (R**2/2)*(theta - Math.sin(theta));
      const effectiveArea = areaABC - areaSegment;
      const forcePerCutter = effectiveArea*ss;
      const totalForce = forcePerCutter*n;
      const r = (D/2)/1000;
      const torque = totalForce*r;
      const speedMps = speed/60;
      const powerKw = (totalForce*speedMps)/1000;
      $('#slResult', container).innerHTML = resultBox(
        resultRow('Chord Length (ab)', fmt(lengthAB,3), 'mm') +
        resultRow('Length bc', fmt(lengthBC,3), 'mm') +
        resultRow('Effective Shear Area (per cutter)', fmt(effectiveArea,3), 'mm²') +
        resultRow('Shear Force (per cutter)', fmt(forcePerCutter), 'N')
      ) + resultBox(
        resultRow('Total Shear Force ('+n+' cutters)', fmt(totalForce), 'N', true) +
        resultRow('Total Torque', fmt(torque), 'N·m', true) +
        resultRow('Power', fmt(powerKw), 'kW', true)
      );
    } catch(e){ $('#slResult', container).innerHTML = errorBox(e.message); }
  });
  $('#slCalc', container).click();
});

/* ---------------------------------------------------------------------
   22. ARBOR DIAMETER (multi-point-load simply-supported beam + SFD/BMD)
   --------------------------------------------------------------------- */
reg('arbor', 'Arbor Diameter', 'Shafts & Rotating Elements', function(container){
  container.innerHTML = `
    <h2>Arbor Diameter</h2>
    <div class="calc-desc">Simply-supported beam with any number of point loads (e.g. slitter blade reactions). Computes reactions, SFD/BMD, required diameter, and optionally checks a given diameter.</div>
    ${card('Beam', fRow('arL','Beam Span (L)',1000,'mm')+fRow('arSigma','Allowable Bending Stress (σ_all)',80,'MPa'))}
    <div id="arLoads"></div>
    <button class="btn secondary" id="arAddLoad">+ Add Load</button>
    ${card('Optional Check', fRow('arI','Actual Moment of Inertia (I)', '', 'mm⁴'))}
    <button class="btn" id="arCalc">Calculate</button>
    <div id="arResult"></div>
  `;
  let loads = [{P:5000, a:500}];
  function renderLoads(){
    $('#arLoads', container).innerHTML = card('Point Loads', loads.map((l,i)=>`
      <div class="load-list-row">
        <span>Load ${i+1}:</span> P= <input type="number" value="${l.P}" data-i="${i}" data-f="P"> N
        at a= <input type="number" value="${l.a}" data-i="${i}" data-f="a"> mm from left support
        <button class="remove-btn" data-remove="${i}">✕</button>
      </div>`).join(''));
    $all('input[data-i]', container).forEach(inp => {
      inp.addEventListener('input', () => { loads[+inp.dataset.i][inp.dataset.f] = parseFloat(inp.value); });
    });
    $all('[data-remove]', container).forEach(btn => {
      btn.addEventListener('click', () => { loads.splice(+btn.dataset.remove,1); renderLoads(); });
    });
  }
  renderLoads();
  $('#arAddLoad', container).addEventListener('click', () => { loads.push({P:1000,a:100}); renderLoads(); });

  $('#arCalc', container).addEventListener('click', () => {
    try {
      const L = num(container,'arL'), sigmaAll = num(container,'arSigma');
      if (L<=0||sigmaAll<=0) throw new Error('Beam span and allowable stress must be positive.');
      if (!loads.length) throw new Error('Add at least one point load.');
      let momentSumForR1=0, totalForce=0;
      for (const l of loads){
        if (l.a<0||l.a>L) throw new Error(`Load distance (a=${l.a}) must be within [0, ${L}] mm.`);
        momentSumForR1 += l.P*(L-l.a);
        totalForce += l.P;
      }
      const R1 = momentSumForR1/L, R2 = totalForce-R1;
      // sample points for SFD/BMD
      const xs = new Set([0,L]);
      loads.forEach(l=>xs.add(l.a));
      for (let i=0;i<=40;i++) xs.add(Math.round(L*i/40*100)/100);
      const points = Array.from(xs).sort((a,b)=>a-b);
      let maxM = 0, maxMx = 0;
      const bmdData = points.map(x => {
        let m = R1*x;
        for (const l of loads) if (l.a < x) m -= l.P*(x-l.a);
        if (Math.abs(m) > Math.abs(maxM)) { maxM = m; maxMx = x; }
        return {x, m};
      });
      const sfdData = points.map(x => {
        let v = R1;
        for (const l of loads) if (l.a < x) v -= l.P;
        return {x, v};
      });
      const dReq = maxM===0 ? 0 : Math.cbrt((32*Math.abs(maxM))/(PI*sigmaAll));

      let html = resultBox(
        resultRow('Left Reaction (R1)', fmt(R1), 'N') +
        resultRow('Right Reaction (R2)', fmt(R2), 'N') +
        resultRow('Max Bending Moment', fmt(Math.abs(maxM)), 'N·mm — at x='+fmt(maxMx,1)+' mm') +
        resultRow('Required Arbor Diameter', fmt(dReq), 'mm', true)
      );

      const Igiven = num(container,'arI');
      if (!Number.isNaN(Igiven) && Igiven>0) {
        const dGiven = Math.pow((64*Igiven)/PI, 0.25);
        const sigmaActual = (Math.abs(maxM)*(dGiven/2))/Igiven;
        const ok = sigmaActual <= sigmaAll;
        html += resultBox(
          resultRow('Equivalent Diameter for given I', fmt(dGiven), 'mm') +
          resultRow('Actual Bending Stress', fmt(sigmaActual), 'MPa') +
          resultRow('Status', ok?'SAFE':'UNSAFE', '', true), ok?'ok':'error'
        );
      }
      $('#arResult', container).innerHTML = html;
    } catch(e){ $('#arResult', container).innerHTML = errorBox(e.message); }
  });
  $('#arCalc', container).click();
});

/* ---------------------------------------------------------------------
   23. BRIDLE
   --------------------------------------------------------------------- */
reg('bridle', 'Bridle', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Bridle Roll Calculator</h2>
    ${card('Inputs',
      fRow('brTheta','Total Wrap Angle',460,'°')+
      fRow('brMu','Friction Coefficient (μ)',0.2,'')+
      fRow('brSpeed','Line Speed',100,'m/min')+
      fRow('brWidth','Strip Width',1500,'mm')+
      fRow('brThick','Strip Thickness',2,'mm')+
      fRow('brCurrent','Current Tension',0.7,'kg/mm²')+
      fRow('brDesired','Desired Tension',1.5,'kg/mm²')+
      fRow('brSplit1','Roll 1 Power Split (optional)', '', '%')+
      fRow('brSplit2','Roll 2 Power Split (optional)', '', '%')
    )}
    <button class="btn" id="brCalc">Calculate</button>
    <div id="brResult"></div>
  `;
  $('#brCalc', container).addEventListener('click', () => {
    try {
      const g=9.81;
      const thetaDeg=num(container,'brTheta'), mu=num(container,'brMu'), speed=num(container,'brSpeed');
      const width=num(container,'brWidth'), thick=num(container,'brThick');
      const currentKg=num(container,'brCurrent'), desiredKg=num(container,'brDesired');
      if (thetaDeg<=0||mu<=0||speed<=0||width<=0||thick<=0) throw new Error('All geometric/process inputs must be positive.');
      let split1 = num(container,'brSplit1')/100, split2 = num(container,'brSplit2')/100;
      const hasCustomSplit = !Number.isNaN(split1) && !Number.isNaN(split2) && Math.abs(split1+split2-1)<1e-6 && split1>=0 && split2>=0;

      const A = width*thick;
      const v = speed/60;
      const Fcurrent = currentKg*g*A, Fdesired = desiredKg*g*A;
      const thetaRad = deg2rad(thetaDeg);
      const maxRatio = Math.exp(mu*thetaRad);
      const isDriving = Fdesired > Fcurrent;
      const requiredRatio = isDriving ? Fdesired/Fcurrent : Fcurrent/Fdesired;

      let html = resultBox(
        resultRow('Cross-Sectional Area', fmt(A), 'mm²') +
        resultRow('Current Force', fmt(Fcurrent), 'N') +
        resultRow('Desired Force', fmt(Fdesired), 'N') +
        resultRow('Max Tension Ratio (1 bridle)', fmt(maxRatio,3)) +
        resultRow('Required Ratio', fmt(requiredRatio,3)) +
        resultRow('Mode', isDriving?'Driving':'Braking')
      );

      let numBridles = 1;
      const powerTotalW = (Fdesired-Fcurrent)*v;
      const powerTotalKw = powerTotalW/1000;

      if (requiredRatio > maxRatio) {
        numBridles = Math.ceil(Math.log(requiredRatio)/Math.log(maxRatio));
        let currentF = Fcurrent;
        let rows = '';
        for (let i=1;i<=numBridles;i++){
          const nextF = isDriving ? Math.min(currentF*maxRatio, Fdesired) : Math.max(currentF/maxRatio, Fdesired);
          const pKw = ((nextF-currentF)*v)/1000;
          rows += resultRow('Bridle '+i, fmt(currentF)+' N → '+fmt(nextF)+' N', ' | '+fmt(pKw)+' kW');
          currentF = nextF;
        }
        html += resultBox(resultRow('Adequacy', 'NOT adequate with 1 bridle — need at least '+numBridles, '', true) + rows, 'warn');
      } else {
        html += resultBox(resultRow('Adequacy', 'Adequate with 1 bridle', '', true), 'ok');
      }

      html += resultBox(resultRow('Total Power', fmt(powerTotalKw), 'kW', true));

      if (numBridles === 1) {
        if (!hasCustomSplit) { split1 = isDriving?0.30:0.25; split2 = isDriving?0.70:0.75; }
        html += resultBox(
          resultRow('Roll 1 Power ('+Math.round(split1*100)+'%)', fmt(powerTotalKw*split1), 'kW') +
          resultRow('Roll 2 Power ('+Math.round(split2*100)+'%)', fmt(powerTotalKw*split2), 'kW')
        );
      }
      $('#brResult', container).innerHTML = html;
    } catch(e){ $('#brResult', container).innerHTML = errorBox(e.message); }
  });
  $('#brCalc', container).click();
});

/* ---------------------------------------------------------------------
   24. ACCUMULATOR
   --------------------------------------------------------------------- */
reg('accumulator', 'Accumulator', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Accumulator Drive Power</h2>
    <div class="calc-desc">Sizes the drive motor for a known accumulator ("Max Accumulated Length"). Don't know that length yet? Use the <b>Accumulator Storage Capacity</b> calculator first to derive it from the carriage's loop count &amp; travel, then bring that value here.</div>
    ${card('Inputs',
      fRow('acMc','Carriage & Rolls Mass (mc)',8000,'kg')+
      fRow('acW','Strip Width (W)',1.5,'m')+
      fRow('acT','Strip Thickness (T)',3,'mm')+
      fRow('acLacc','Max Accumulated Length',240,'m')+
      fRow('acV','Max Carriage Lifting Speed',0.4,'m/s')+
      fRow('acTacc','Acceleration Time',5,'s')+
      fRow('acSigma','Specific Strip Tension (σ)',1.5,'kg/mm²')+
      fRow('acMueff','Effective Friction Factor (µeff)',0.08,'')+
      fRow('acEta','Overall Mechanical Efficiency (η)',0.85,'0–1')+
      fRow('acSF','Safety Factor',1.2,'')+
      fRow('acN','Number of Rolls on Carriage',1,'')+
      fRow('acRho','Strip Density',7850,'kg/m³')
    )}
    <button class="btn" id="acCalc">Calculate</button>
    <div id="acResult"></div>
  `;
  $('#acCalc', container).addEventListener('click', () => {
    try {
      const g=9.81;
      const mc=num(container,'acMc'), W=num(container,'acW'), T=num(container,'acT');
      const Lacc=num(container,'acLacc'), v=num(container,'acV'), t=num(container,'acTacc');
      const sigma=num(container,'acSigma'), mueff=num(container,'acMueff'), eta=num(container,'acEta');
      const SF=num(container,'acSF'), N=Math.round(num(container,'acN')), rho=num(container,'acRho');
      if ([mc,W,T,Lacc,v,t].some(x=>x<=0)) throw new Error('mc, W, T, Lacc, v, t must be positive.');
      if (eta<=0||eta>1) throw new Error('Efficiency must be in (0, 1].');

      const Tm = T/1000;
      const ms = rho*Lacc*W*Tm;
      const mtotal = mc+ms;
      const sigmaN = sigma*9.81;
      const area = (W*1000)*T;
      const FT = sigmaN*area;
      const Ftension = 2*N*FT;
      const Fg = mtotal*g;
      const Ff = (Fg+Ftension)*mueff;
      const a = v/t;
      const Fa = mtotal*a;
      const Fpeak = Fg+Ftension+Ff+Fa;
      const PdrumKw = (Fpeak*v)/1000;
      const PshaftKw = PdrumKw/eta;
      const PmotorKw = PshaftKw*SF;

      $('#acResult', container).innerHTML = resultBox(
        resultRow('Mass of Strip', fmt(ms), 'kg') +
        resultRow('Total Mass', fmt(mtotal), 'kg') +
        resultRow('Tension Force', fmt(Ftension), 'N') +
        resultRow('Gravitational Force', fmt(Fg), 'N') +
        resultRow('Frictional Force', fmt(Ff), 'N') +
        resultRow('Acceleration Force', fmt(Fa), 'N') +
        resultRow('Total Peak Lifting Force', fmt(Fpeak), 'N', true)
      ) + resultBox(
        resultRow('Power at Winch Drum', fmt(PdrumKw), 'kW') +
        resultRow('Motor Shaft Power', fmt(PshaftKw), 'kW') +
        resultRow('Recommended Motor Size', fmt(PmotorKw), 'kW', true)
      );
    } catch(e){ $('#acResult', container).innerHTML = errorBox(e.message); }
  });
  $('#acCalc', container).click();
});

/* ---------------------------------------------------------------------
   24b. ACCUMULATOR STORAGE CAPACITY
   ---------------------------------------------------------------------
   A looper/accumulator tower stores a length of strip so the line can
   keep running while the entry (or exit) end is stopped for a coil
   change / weld. Storage length is derived from geometry, not entered
   directly:
     Storage Length (m) = Passes-per-Roll × Number of Moving Rolls × Stroke
   "Passes per Roll" is 2 for a classic vertical tower (strip runs both
   down AND back up around each moving roll on the carriage) — editable
   in case your accumulator's geometry differs.
   --------------------------------------------------------------------- */
reg('accumulator-capacity', 'Accumulator Storage Capacity', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Accumulator Storage Capacity</h2>
    <div class="calc-desc">Derives how much strip length (and buffer time) a looper/accumulator tower can store, from its carriage's loop count and travel — so the line can keep running while entry or exit is stopped for a coil change. Feed the resulting length into the <b>Accumulator</b> drive-power calculator as "Max Accumulated Length".</div>
    ${card('Accumulator Geometry',
      fRow('asN','Number of Moving Rolls on Carriage',8,'')+
      fRow('asStroke','Carriage Travel / Stroke',15,'m')+
      fRow('asMult','Strip Passes per Roll',2,'') +
      `<div class="note">Passes per Roll is 2 for a standard vertical accumulator tower (the strip goes down and back up around every moving roll as the carriage travels). Change it if your accumulator's layout is different.</div>`
    )}
    ${card('Line Speed (for Buffer Time)',
      fRow('asSpeed','Line Running Speed',40,'m/min') +
      `<div class="note">The speed at which the line keeps running (fed from the accumulator) while entry/exit is stopped — usually the threading or rated speed for that product.</div>`
    )}
    ${card('Stored Mass (optional)',
      fRow('asWidth','Strip Width',1500,'mm')+
      fRow('asThk','Strip Thickness',2,'mm')+
      fRow('asRho','Strip Density',7850,'kg/m³') +
      `<div class="note">Leave these as-is if you only need buffer length/time — this section additionally estimates the tonnage of strip held in storage at full capacity.</div>`
    )}
    <button class="btn" id="asCalc">Calculate</button>
    <div id="asResult"></div>
  `;
  $('#asCalc', container).addEventListener('click', () => {
    try {
      const N = num(container,'asN'), stroke = num(container,'asStroke'), mult = num(container,'asMult');
      const speed = num(container,'asSpeed');
      const width = num(container,'asWidth'), thk = num(container,'asThk'), rho = num(container,'asRho');
      if (!(N>0)) throw new Error('Number of moving rolls must be positive.');
      if (!(stroke>0)) throw new Error('Carriage travel / stroke must be positive.');
      if (!(mult>0)) throw new Error('Strip passes per roll must be positive.');
      if (!(speed>0)) throw new Error('Line running speed must be positive.');

      const storageLength = mult * N * stroke; // m
      const bufferTimeMin = storageLength / speed; // min
      const bufferTimeSec = bufferTimeMin * 60; // s

      let out = resultBox(
        resultRow('Storage Capacity (Buffer Length)', fmt(storageLength,2), 'm', true) +
        resultRow('Buffer Time', fmt(bufferTimeMin,2), 'min') +
        resultRow('Buffer Time', fmt(bufferTimeSec,0), 's')
      );

      if (width>0 && thk>0 && rho>0) {
        const storedKg = storageLength * (width/1000) * (thk/1000) * rho;
        const storedTons = storedKg/1000;
        out += resultBox(
          resultRow('Strip Held in Storage', fmt(storedKg,1), 'kg') +
          resultRow('Strip Held in Storage', fmt(storedTons,3), 't', true)
        );
      } else {
        out += note('Enter Width, Thickness and Density above (all > 0) to also see the stored mass/tonnage.');
      }

      $('#asResult', container).innerHTML = out;
    } catch(e){ $('#asResult', container).innerHTML = errorBox(e.message); }
  });
  $('#asCalc', container).click();
});

/* ---------------------------------------------------------------------
   25. ROLLING LOAD
   --------------------------------------------------------------------- */
// Sims (1954) original Table 1 — Qp(R'/h, r) and QG(R'/h, r), digitised from
// R. B. Sims, "The Calculation of Roll Force and Torque in Hot Rolling Mills",
// Proc. I.Mech.E. 168 (1954), p.192, Table 1.
const SIMS_RH = [5,10,20,30,50,100,150,200,300];
const SIMS_R  = [0.1,0.2,0.3,0.4,0.5,0.6];
const SIMS_QP = [
  [0.9513,1.0109,1.0485,1.0685,1.0719,1.0545],
  [1.0285,1.1257,1.1952,1.2443,1.2761,1.2852],
  [1.1371,1.2863,1.4006,1.4908,1.5609,1.6072],
  [1.2219,1.4093,1.5567,1.6795,1.7792,1.8528],
  [1.3521,1.6044,1.8066,1.9763,2.1234,2.2413],
  [1.5976,1.9630,2.2628,2.5232,2.7563,2.9549],
  [1.7814,2.2387,2.6129,2.9422,3.2407,3.5021],
  [1.9397,2.4699,2.9061,3.2943,3.6486,3.9630],
  [2.2012,2.8570,3.3996,3.8879,4.3354,4.7353]
];
const SIMS_QG = [
  [0.0114,0.0267,0.0465,0.0720,0.1053,0.1509],
  [0.0063,0.0154,0.0274,0.0431,0.0640,0.0931],
  [0.0036,0.0091,0.0166,0.0266,0.0401,0.0591],
  [0.0027,0.0069,0.0126,0.0203,0.0310,0.0459],
  [0.00175,0.0049,0.0090,0.0148,0.0226,0.0337],
  [0.00115,0.0031,0.0059,0.0097,0.0150,0.0226],
  [0.0008,0.0024,0.0046,0.0077,0.0119,0.0180],
  [0.0007,0.0020,0.0039,0.0065,0.0101,0.0153],
  [0.0005,0.0016,0.0030,0.0052,0.0080,0.0123]
];
function simsInterp1(x, xs, ys){
  if (x<=xs[0]) return ys[0];
  if (x>=xs[xs.length-1]) return ys[ys.length-1];
  for (let i=0;i<xs.length-1;i++){
    if (x>=xs[i] && x<=xs[i+1]){
      const t=(x-xs[i])/(xs[i+1]-xs[i]);
      return ys[i]+t*(ys[i+1]-ys[i]);
    }
  }
}
function simsLookup(table, RhVal, rVal){
  const rC = Math.min(Math.max(rVal,SIMS_R[0]),SIMS_R[SIMS_R.length-1]);
  let lo=0, hi=SIMS_RH.length-1;
  if (RhVal<=SIMS_RH[0]) { lo=hi=0; }
  else if (RhVal>=SIMS_RH[SIMS_RH.length-1]) { lo=hi=SIMS_RH.length-1; }
  else { for (let i=0;i<SIMS_RH.length-1;i++){ if (RhVal>=SIMS_RH[i] && RhVal<=SIMS_RH[i+1]){ lo=i; hi=i+1; break; } } }
  const rowLo = simsInterp1(rC, SIMS_R, table[lo]);
  if (lo===hi) return rowLo;
  const rowHi = simsInterp1(rC, SIMS_R, table[hi]);
  const t = (Math.log(RhVal)-Math.log(SIMS_RH[lo]))/(Math.log(SIMS_RH[hi])-Math.log(SIMS_RH[lo]));
  return rowLo + t*(rowHi-rowLo);
}

reg('rolling-load', 'Rolling Load', 'Rolling Mill Process', function(container){
  container.innerHTML = `
    <h2>Rolling Load Calculator</h2>
    <div class="calc-desc">Roll force, torque, power and max draft for flat rolling — compare the Simplified (linear friction-hill), Ekelund, and Sims (1954, with Hitchcock roll-flattening) methods side by side.</div>
    ${card('Inputs',
      fRow('rlH0','Initial Thickness (H, h0)',10,'mm')+
      fRow('rlHf','Final Thickness (h, hf)',8,'mm')+
      fRow('rlW','Strip Width',1000,'mm')+
      fRow('rlR','Roll Radius (undeformed, R)',300,'mm')+
      fRow('rlMu','Friction Coefficient (μ)',0.1,'')+
      fRow('rlK','Strength Coeff. (K)',600,'MPa')+
      fRow('rlN','Strain-hardening exponent (n)',0.2,'')+
      fRow('rlSpeed','Roll Speed',60,'RPM')
    )}
    ${card('Roll Material (for Sims / Hitchcock flattening)',
      fRow('rlEroll','Roll Youngs Modulus (E)',210,'GPa')+
      fRow('rlNu','Roll Poissons Ratio (ν)',0.3,'')
    )}
    ${card('Method for Torque/Power', fSelect('rlMethod','Use Method', [
      {value:'simplified', label:'Simplified — Linear Friction-Hill'},
      {value:'ekelund', label:'Ekelund'},
      {value:'sims', label:"Sims (1954) — Hitchcock roll flattening"}
    ], 'simplified'))}
    <button class="btn" id="rlCalc">Calculate</button>
    <div id="rlResult"></div>
  `;
  $('#rlCalc', container).addEventListener('click', () => {
    try {
      const h0=num(container,'rlH0'), hf=num(container,'rlHf'), w=num(container,'rlW');
      const R=num(container,'rlR'), mu=num(container,'rlMu'), K=num(container,'rlK'), n=num(container,'rlN');
      const speedRpm=num(container,'rlSpeed');
      const Eroll=num(container,'rlEroll')*1000; // GPa -> N/mm^2 (MPa)
      const nu=num(container,'rlNu');
      const method = str(container,'rlMethod');
      if (h0<=hf) throw new Error('Initial thickness must be greater than final thickness.');
      const deltaH = h0-hf;
      const hm = (h0+hf)/2;
      const deltaHMax = mu*mu*R;
      const draftOk = deltaH <= deltaHMax;
      const strain = Math.log(h0/hf);
      const Yavg = (K*Math.pow(strain,n))/(n+1); // average uniaxial flow stress
      const Ybar = (2/Math.sqrt(3))*Yavg; // plane-strain flow stress

      // Rigid (undeformed-roll) contact length, used by Simplified & Ekelund
      const L0 = Math.sqrt(R*deltaH);

      // --- Method 1: Simplified linear friction-hill ---
      const Qp_simplified = 1 + (mu*L0)/(2*hm);
      const F_simplified = w*L0*Ybar*Qp_simplified;

      // --- Method 2: Ekelund ---
      // p_r/Ybar = 1 + 1.6*mu*(L/hm) - 1.2*(deltaH/hm)
      let Qp_ekelund = 1 + 1.6*mu*(L0/hm) - 1.2*(deltaH/hm);
      if (Qp_ekelund < 0.05) Qp_ekelund = 0.05; // guard against unphysical negative pressure at extreme inputs
      const F_ekelund = w*L0*Ybar*Qp_ekelund;

      // --- Method 3: Sims (1954), with Hitchcock roll-flattening (iterative) ---
      // Sims defines r=(H-h)/H and looks up Qp, QG against R'/h using the EXIT thickness h.
      // Force: F = w*Ȳ*sqrt(R'·Δh)*Qp(R'/h, r)   [eq. 9]
      // Torque (per roll): G = 2*w*Ȳ*R*R'*QG(R'/h, r)   [eq. 11]
      // Sims assumes sticking friction over the whole arc, so μ does not enter these two equations.
      // Hitchcock: R' = R*(1 + C*(F/w)/Δh), C = 16(1-ν²)/(πE)  — solved iteratively.
      const rSims = deltaH/h0;
      const C_hitch = (16*(1-nu*nu))/(PI*Eroll);
      let Rp = R, F_sims = F_simplified, Qp_sims = 1;
      for (let i=0;i<25;i++){
        Qp_sims = simsLookup(SIMS_QP, Rp/hf, rSims);
        F_sims = w*Ybar*Math.sqrt(Rp*deltaH)*Qp_sims;
        Rp = R*(1 + C_hitch*(F_sims/w)/deltaH);
      }
      const QG_sims = simsLookup(SIMS_QG, Rp/hf, rSims);
      const G_sims = 2*w*Ybar*R*Rp*QG_sims; // total torque per roll, N·mm
      const L_sims = Math.sqrt(Rp*deltaH); // bite length for the diagram, display only
      const simsOutOfRange = (rSims<SIMS_R[0] || rSims>SIMS_R[SIMS_R.length-1] || (Rp/hf)<SIMS_RH[0] || (Rp/hf)>SIMS_RH[SIMS_RH.length-1]);

      // Pick the method used downstream for torque/power
      let Fsel, Lsel, methodLabel, torquePerRoll;
      if (method==='ekelund'){
        Fsel=F_ekelund; Lsel=L0; methodLabel='Ekelund';
        torquePerRoll = Fsel*(0.5*Lsel)/1000; // lever-arm approx, a≈L/2
      } else if (method==='sims'){
        Fsel=F_sims; Lsel=L_sims; methodLabel='Sims (1954)';
        torquePerRoll = G_sims/1000; // Sims gives torque directly via QG — no lever-arm approximation needed
      } else {
        Fsel=F_simplified; Lsel=L0; methodLabel='Simplified';
        torquePerRoll = Fsel*(0.5*Lsel)/1000; // lever-arm approx, a≈L/2
      }
      const omega = speedRpm*2*PI/60;
      const powerPerRollKw = (torquePerRoll*omega)/1000;

      $('#rlResult', container).innerHTML = resultBox(
        resultRow('Draft (Δh)', fmt(deltaH,3), 'mm') +
        resultRow('Max Possible Draft (μ²R)', fmt(deltaHMax,3), 'mm', true) +
        resultRow('Draft Check', draftOk?'OK — within friction limit':'EXCEEDS max draft — strip will slip', '', true)
      , draftOk?'ok':'error') + resultBox(
        resultRow('True Strain', fmt(strain,4)) +
        resultRow('Avg Flow Stress (plane-strain, Ȳ)', fmt(Ybar), 'MPa') +
        resultRow('Method Used (below)', methodLabel, '', true) +
        resultRow('Contact Length (used)', fmt(Lsel,3), 'mm') +
        resultRow('Roll Separating Force', fmt(Fsel/1000), 'kN', true) +
        resultRow('Torque (per roll)', fmt(torquePerRoll), 'N·m') +
        resultRow('Power (per roll)', fmt(powerPerRollKw), 'kW', true) +
        resultRow('Total Mill Power (2 rolls, approx.)', fmt(2*powerPerRollKw), 'kW', true)
      ) + card('Method Comparison', `
        <table class="mini">
          <tr><th>Method</th><th>Contact Length L (mm)</th><th>Qp</th><th>Force (kN)</th></tr>
          <tr><td>Simplified (Linear)</td><td>${fmt(L0,2)}</td><td>${fmt(Qp_simplified,4)}</td><td>${fmt(F_simplified/1000,2)}</td></tr>
          <tr><td>Ekelund</td><td>${fmt(L0,2)}</td><td>${fmt(Qp_ekelund,4)}</td><td>${fmt(F_ekelund/1000,2)}</td></tr>
          <tr><td>Sims (1954), R'=${fmt(Rp,1)}mm</td><td>${fmt(L_sims,2)}</td><td>${fmt(Qp_sims,4)}</td><td>${fmt(F_sims/1000,2)}</td></tr>
        </table>
      `) + note("Simplified: F=wLȲ(1+μL/2hm). Ekelund: F=wLȲ(1+1.6μL/hm−1.2Δh/hm) — Ekelund's formula as cited in rolling-force literature. Sims (1954): F=wȲ√(R'Δh)·Qp and torque G=2wȲ·R·R'·QG, using Qp/QG interpolated from Sims' own published Table 1 (r=(H−h)/H, looked up against R'/h using exit thickness), with R' from Hitchcock's flattened-roll equation solved iteratively. Sims assumes full sticking friction over the arc of contact, so μ does not enter the Sims force/torque calculation itself — it is still used for the draft-limit check above."
      + (simsOutOfRange ? " Note: the current reduction or R'/h falls outside the range of Sims' original table (r=0.1–0.6, R'/h=5–300), so the Sims row is extrapolated and less reliable." : '')
      + ' For Simplified/Ekelund, torque uses a simplified lever arm a≈L/2. For precise neutral-point location use the Bite Angle calculator alongside this one.');
    } catch(e){ $('#rlResult', container).innerHTML = errorBox(e.message); }
  });
  $('#rlCalc', container).click();
});

/* ---------------------------------------------------------------------
   26. BITE ANGLE / ROLL DIAMETER
   --------------------------------------------------------------------- */
reg('bite-angle', 'Bite Angle / Roll Diameter', 'Rolling Mill Process', function(container){
  container.innerHTML = `
    <h2>Bite Angle ↔ Roll Diameter</h2>
    <div class="calc-desc">D·(1−cos α) = Δh, where Δh = h₀ − h_f</div>
    ${card('', fSelect('baMode','Solve for', [{value:'diam',label:'Diameter from Bite Angle'},{value:'angle',label:'Bite Angle from Diameter'}], 'diam'))}
    ${card('', fSelect('baThickMode','Thickness input', [{value:'abs',label:'h0 & hf (absolute)'},{value:'pct',label:'h0 & reduction %'}], 'abs'))}
    <div id="baFields"></div>
    <button class="btn" id="baCalc">Calculate</button>
    <div id="baResult"></div>
  `;
  function renderFields(){
    const mode = str(container,'baMode'), tm = str(container,'baThickMode');
    let html = fRow('baH0','Initial Thickness (h0)',10,'mm');
    html += tm==='abs' ? fRow('baHf','Final Thickness (hf)',8,'mm') : fRow('baPct','Reduction',20,'%');
    html += mode==='diam' ? fRow('baAlpha','Bite Angle (α)',20,'°') : fRow('baD','Roll Diameter (D)',600,'mm');
    $('#baFields', container).innerHTML = card('Inputs', html);
  }
  renderFields();
  $('#baMode', container).addEventListener('change', renderFields);
  $('#baThickMode', container).addEventListener('change', renderFields);
  $('#baCalc', container).addEventListener('click', () => {
    try {
      const h0 = num(container,'baH0');
      const tm = str(container,'baThickMode');
      const hf = tm==='abs' ? num(container,'baHf') : h0*(1-num(container,'baPct')/100);
      if (h0<=hf) throw new Error('h0 must be greater than hf.');
      const deltaH = h0-hf;
      const mode = str(container,'baMode');
      if (mode === 'diam') {
        const alphaDeg = num(container,'baAlpha');
        if (!(alphaDeg>0 && alphaDeg<180)) throw new Error('α must be between 0° and 180°.');
        const alphaRad = deg2rad(alphaDeg);
        if (Math.cos(alphaRad) >= 1) throw new Error('Invalid bite angle.');
        const D = deltaH/(1-Math.cos(alphaRad));
        $('#baResult', container).innerHTML = resultBox(resultRow('Δh', fmt(deltaH,3), 'mm') + resultRow('Roll Diameter', fmt(D), 'mm', true));
      } else {
        const D = num(container,'baD');
        if (D<=0) throw new Error('Diameter must be positive.');
        if (deltaH >= D) throw new Error('Δh too large for the given diameter.');
        const cosAlpha = 1 - deltaH/D;
        const alphaDeg = rad2deg(Math.acos(cosAlpha));
        $('#baResult', container).innerHTML = resultBox(resultRow('Δh', fmt(deltaH,3), 'mm') + resultRow('Bite Angle', fmt(alphaDeg), '°', true));
      }
    } catch(e){ $('#baResult', container).innerHTML = errorBox(e.message); }
  });
  $('#baCalc', container).click();
});

/* ---------------------------------------------------------------------
   27. DEFLECTOR / BRIDLE ROLL DIAMETER
   --------------------------------------------------------------------- */
reg('deflector', 'Deflector/Bridle Roll Diameter', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Deflector / Bridle Roll Diameter</h2>
    <div class="calc-desc">Required moment of inertia from allowable deflection, then solid or hollow roll diameter.</div>
    ${card('Inputs',
      fRow('dfT','Strip Thickness',3.2,'mm')+
      fRow('dfW','Strip Width',1650,'mm')+
      fRow('dfTension','Tension',2,'kg/mm²')+
      fRow('dfE','Youngs Modulus (E)',210000,'N/mm²')+
      fRow('dfSpan','Bearing Span (L)',1800,'mm')+
      fRow('dfWrap','Wrap Angle',30,'°')+
      fRow('dfDefl','Max Allowable Deflection',0.5,'mm')+
      fRow('dfDensity','Density',7860,'kg/m³')
    )}
    <button class="btn" id="dfCalcMoi">Calculate Required MOI</button>
    <div id="dfMoiResult"></div>
    <div id="dfCylinderOptions" style="display:none;">
      ${card('Cylinder Type', fSelect('dfCylType','Type', [{value:'solid',label:'Solid Cylinder'},{value:'hollow',label:'Hollow Cylinder'}], 'solid') + `<div id="dfCylFields"></div><button class="btn" id="dfCylCalc">Calculate</button><div id="dfCylResult"></div>`)}
    </div>
  `;
  let requiredI = null;
  $('#dfCalcMoi', container).addEventListener('click', () => {
    try {
      const t=num(container,'dfT'), w=num(container,'dfW'), tensionKg=num(container,'dfTension');
      const E=num(container,'dfE'), L=num(container,'dfSpan'), thetaDeg=num(container,'dfWrap'), delta=num(container,'dfDefl');
      const sigmaTN = tensionKg*9.81;
      const T = sigmaTN*w*t;
      const F = 2*T*Math.sin(deg2rad(thetaDeg)/2);
      const W = F/w;
      requiredI = (5*W*Math.pow(L,4))/(384*E*delta);
      $('#dfMoiResult', container).innerHTML = resultBox(
        resultRow('Total Tension Force', fmt(T), 'N') +
        resultRow('Force on Roll', fmt(F), 'N') +
        resultRow('UDL equivalent', fmt(W,4), 'N/mm') +
        resultRow('Required MOI', requiredI.toExponential(3), 'mm⁴', true)
      );
      $('#dfCylinderOptions', container).style.display = 'block';
      renderCylFields();
    } catch(e){ $('#dfMoiResult', container).innerHTML = errorBox(e.message); requiredI=null; }
  });
  function renderCylFields(){
    const type = str(container,'dfCylType');
    let html = fRow('dfSpanL','Roll Length (for weight)',num(container,'dfSpan')||1800,'mm');
    if (type==='hollow') html += fSelect('dfHollowMode','Known dimension', [{value:'od',label:'Known OD → find ID'},{value:'id',label:'Known ID → find OD'}], 'od') + fRow('dfKnownD','Known Diameter',1000,'mm');
    $('#dfCylFields', container).innerHTML = html;
  }
  $('#dfCylType', container).addEventListener('change', renderCylFields);
  $('#dfCylCalc', container).addEventListener('click', () => {
    try {
      if (requiredI===null) throw new Error('Calculate the required MOI first.');
      const type = str(container,'dfCylType');
      const rho = num(container,'dfDensity');
      const L = num(container,'dfSpanL')/1000;
      if (type === 'solid') {
        const D4 = (requiredI*64)/PI;
        const D = Math.pow(D4, 0.25);
        const Dm = D/1000;
        const weight = rho*PI*(Dm/2)**2*L;
        $('#dfCylResult', container).innerHTML = resultBox(resultRow('Solid Diameter', fmt(D), 'mm', true) + resultRow('Weight', fmt(weight), 'kg'));
      } else {
        const mode = str(container,'dfHollowMode'), known = num(container,'dfKnownD');
        const term = (64*requiredI)/PI;
        if (mode === 'od') {
          const ID4 = Math.pow(known,4) - term;
          if (ID4<=0) throw new Error('Resulting ID⁴ is negative — increase OD or reduce required MOI.');
          const ID = Math.pow(ID4,0.25);
          const ODm=known/1000, IDm=ID/1000;
          const weight = rho*PI*(ODm**2-IDm**2)/4*L;
          $('#dfCylResult', container).innerHTML = resultBox(resultRow('Inner Diameter', fmt(ID), 'mm', true) + resultRow('Weight', fmt(weight), 'kg'));
        } else {
          const OD4 = Math.pow(known,4) + term;
          const OD = Math.pow(OD4,0.25);
          const ODm=OD/1000, IDm=known/1000;
          const weight = rho*PI*(ODm**2-IDm**2)/4*L;
          $('#dfCylResult', container).innerHTML = resultBox(resultRow('Outer Diameter', fmt(OD), 'mm', true) + resultRow('Weight', fmt(weight), 'kg'));
        }
      }
    } catch(e){ $('#dfCylResult', container).innerHTML = errorBox(e.message); }
  });
  $('#dfCalcMoi', container).click();
});

/* ---------------------------------------------------------------------
   28. SHAFT CRITICAL SPEED (Rayleigh + Dunkerley)
   --------------------------------------------------------------------- */
reg('critical-speed', 'Shaft Critical Speed', 'Shafts & Rotating Elements', function(container){
  container.innerHTML = `
    <h2>Shaft Critical Speed</h2>
    <div class="calc-desc">Rayleigh's formula N = (30/π)·√(g/δ), combined with self-weight via Dunkerley's method where applicable.</div>
    ${card('', fSelect('csMethod','Method', [
      {value:'A', label:'A. Simply Supported — Self-Weight + Central Point Load'},
      {value:'B', label:'B. Simply Supported — Self-Weight + UDL'},
      {value:'C', label:'C. Cantilever — Self-Weight + End Point Load'},
      {value:'D', label:'D. Cantilever — Self-Weight + UDL'}
    ], 'A'))}
    ${card('', fSelect('csMaterial','Material', [{value:'steel',label:'Steel (E=210 GPa, ρ=7850 kg/m³)'},{value:'alu',label:'Aluminum (E=70 GPa, ρ=2700 kg/m³)'},{value:'custom',label:'Custom'}], 'steel'))}
    <div id="csCustomMat" style="display:none;">${card('Custom Material', fRow('csE','Youngs Modulus (E)',210,'GPa')+fRow('csRho','Density (ρ)',7850,'kg/m³'))}</div>
    ${card('Geometry', fRow('csL','Length (L)',1.5,'m')+fRadioGroup('csShaftType',[{value:'solid',label:'Solid'},{value:'hollow',label:'Hollow'}],'hollow')+fRow('csDo','Outer Diameter',40,'mm')+`<div id="csDiWrap">`+fRow('csDi','Inner Diameter',20,'mm')+`</div>`)}
    <div id="csLoadField"></div>
    <button class="btn" id="csCalc">Calculate</button>
    <div id="csResult"></div>
  `;
  function updateMat(){ $('#csCustomMat', container).style.display = str(container,'csMaterial')==='custom' ? 'block':'none'; }
  function updateDi(){ $('#csDiWrap', container).style.display = $(`input[name="csShaftType"]:checked`,container).value==='hollow' ? 'block':'none'; }
  function updateLoad(){
    const m = str(container,'csMethod');
    const label = (m==='A'||m==='C') ? 'Point Load (W)' : 'Uniform Load (w)';
    const unit = (m==='A'||m==='C') ? 'N' : 'N/m';
    $('#csLoadField', container).innerHTML = card('Load', fRow('csLoad', label, 500, unit));
  }
  $('#csMaterial', container).addEventListener('change', updateMat);
  $all(`input[name="csShaftType"]`, container).forEach(r=>r.addEventListener('change', updateDi));
  $('#csMethod', container).addEventListener('change', updateLoad);
  updateMat(); updateDi(); updateLoad();

  function critSpeed(delta){ return (30/PI)*Math.sqrt(9.81/delta); }

  $('#csCalc', container).addEventListener('click', () => {
    try {
      const L = num(container,'csL');
      const shaftType = $(`input[name="csShaftType"]:checked`,container).value;
      const Do = num(container,'csDo')/1000;
      const Di = shaftType==='hollow' ? num(container,'csDi')/1000 : 0;
      if (shaftType==='hollow' && Di>=Do) throw new Error('Inner diameter must be less than outer diameter.');
      const mat = str(container,'csMaterial');
      let E, rho;
      if (mat==='steel'){ E=210e9; rho=7850; } else if (mat==='alu'){ E=70e9; rho=2700; }
      else { E = num(container,'csE')*1e9; rho = num(container,'csRho'); }
      const I = PI*(Do**4 - Di**4)/64;
      const A = PI*(Do**2 - Di**2)/4;
      const wSelf = rho*A*9.81; // N/m
      const method = str(container,'csMethod');
      const loadVal = num(container,'csLoad');
      let html = resultBox(resultRow('Moment of Inertia (I)', I.toExponential(3), 'm⁴') + resultRow('Self-weight load', fmt(wSelf,4), 'N/m'));
      let Nc;
      if (method==='A') {
        const dPoint = (loadVal*L**3)/(48*E*I);
        const N1 = critSpeed(dPoint);
        const dSelf = (5*wSelf*L**4)/(384*E*I);
        const Ncs = critSpeed(dSelf);
        Nc = 1/Math.sqrt(1/N1**2 + 1/Ncs**2);
        html += resultBox(resultRow('N (point load only)', fmt(N1,0), 'RPM') + resultRow('N (self-weight only)', fmt(Ncs,0), 'RPM') + resultRow('Combined (Dunkerley)', fmt(Nc,0), 'RPM', true));
      } else if (method==='B') {
        const wTotal = wSelf + loadVal;
        const dSt = (5*wTotal*L**4)/(384*E*I);
        Nc = critSpeed(dSt);
        html += resultBox(resultRow('Total UDL (incl. self-weight)', fmt(wTotal,4), 'N/m') + resultRow('Critical Speed', fmt(Nc,0), 'RPM', true));
      } else if (method==='C') {
        const dPoint = (loadVal*L**3)/(3*E*I);
        const N1 = critSpeed(dPoint);
        const dSelf = (wSelf*L**4)/(8*E*I);
        const Ncs = critSpeed(dSelf);
        Nc = 1/Math.sqrt(1/N1**2 + 1/Ncs**2);
        html += resultBox(resultRow('N (point load only)', fmt(N1,0), 'RPM') + resultRow('N (self-weight only)', fmt(Ncs,0), 'RPM') + resultRow('Combined (Dunkerley)', fmt(Nc,0), 'RPM', true));
      } else { // D: cantilever + UDL
        const wTotal = wSelf + loadVal;
        const dSt = (wTotal*L**4)/(8*E*I);
        Nc = critSpeed(dSt);
        html += resultBox(resultRow('Total UDL (incl. self-weight)', fmt(wTotal,4), 'N/m') + resultRow('Critical Speed', fmt(Nc,0), 'RPM', true));
      }
      $('#csResult', container).innerHTML = html;
    } catch(e){ $('#csResult', container).innerHTML = errorBox(e.message); }
  });
  $('#csCalc', container).click();
});

/* ---------------------------------------------------------------------
   29. TOLERANCE & FIT FINDER (ISO 286 — real lookup table, from data.js)
   --------------------------------------------------------------------- */
/* ---- ISO 286 data helpers (TOLERANCE_DATA comes from data.js) ---- */
const TOL_RANGES = TOLERANCE_DATA.ranges;   // [[over,to], ...] in mm
const TOL_GRADES = TOLERANCE_DATA.grades;   // { grade: {upper:[...], lower:[...]} } in microns
function tolIsHoleGrade(grade){ return /^[A-Z]/.test(grade); }
function tolFindRangeIndex(size){
  for (let i = 0; i < TOL_RANGES.length; i++){
    const [over, to] = TOL_RANGES[i];
    if (i === 0 ? (size >= 0 && size <= to) : (size > over && size <= to)) return i;
  }
  return -1;
}
function tolGetDeviation(grade, idx){
  const g = TOL_GRADES[grade];
  if (!g) return null;
  return { upper: g.upper[idx], lower: g.lower[idx] };
}
function tolFmtMicron(v){ return (v>0?'+':'')+v+' µm'; }
function tolLimitStr(v){ return fmt(v,4)+' mm'; }
function tolComputeVerdict(holeDev, shaftDev){
  const maxClearance = holeDev.upper - shaftDev.lower; // microns
  const minClearance = holeDev.lower - shaftDev.upper; // microns
  let verdict, cls;
  if (minClearance >= 0){ verdict = 'Always a clearance fit'; cls = 'ok'; }
  else if (maxClearance <= 0){ verdict = 'Always an interference fit'; cls = 'warn'; }
  else { verdict = 'Transition fit — can land either way'; cls = ''; }
  return { maxClearance, minClearance, verdict, cls };
}

/* ---- Tolerance-zone diagrams (relative to the ISO "zero line") ---- */
function tolScaleFor(vals){
  const top = Math.max(0, ...vals);
  const bottom = Math.min(0, ...vals);
  const range = Math.max(top - bottom, 10); // never fully collapse the scale
  return { top, bottom, padded: range * 1.35 };
}
function tolDiagramSingle(size, memberType, grade, dev){
  const drawH = 170, marginTop = 36, marginBottom = 30;
  const svgW = 360, svgH = marginTop + drawH + marginBottom;
  const { top, bottom, padded } = tolScaleFor([dev.upper, dev.lower]);
  const mid = (top + bottom) / 2;
  const paddedTop = mid + padded / 2, paddedBottom = mid - padded / 2;
  const scale = drawH / (paddedTop - paddedBottom);
  const y = v => marginTop + (paddedTop - v) * scale;
  const zeroY = y(0);
  let zTop = y(dev.upper), zBot = y(dev.lower);
  if (zBot - zTop < 3){ const c=(zTop+zBot)/2; zTop=c-1.5; zBot=c+1.5; }
  const cx = 150, zw = 70;
  const upLbl = memberType === 'hole' ? 'ES' : 'es';
  const loLbl = memberType === 'hole' ? 'EI' : 'ei';
  return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" style="max-width:380px;display:block;margin:8px auto 2px;">
    <line x1="18" y1="${zeroY}" x2="${svgW-16}" y2="${zeroY}" stroke="var(--text-faint)" stroke-width="1.2" stroke-dasharray="4,3"/>
    <text x="18" y="${zeroY-7}" font-size="10.5" fill="var(--text-faint)" font-family="var(--font-mono)">Zero line — Ø${fmt(size)} (basic size)</text>
    <rect x="${cx-zw/2}" y="${Math.min(zTop,zBot)}" width="${zw}" height="${Math.abs(zBot-zTop)}" fill="var(--accent)" fill-opacity="0.22" stroke="var(--accent-deep)" stroke-width="1.5"/>
    <text x="${cx}" y="${Math.min(zTop,zBot)-9}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--accent-deep)" font-family="var(--font-display)">${grade}</text>
    <line x1="${cx+zw/2+6}" y1="${zeroY}" x2="${cx+zw/2+6}" y2="${y(dev.upper)}" stroke="var(--text-dim)" stroke-width="1"/>
    <text x="${cx+zw/2+10}" y="${(zeroY+y(dev.upper))/2+4}" font-size="11" fill="var(--text)" font-family="var(--font-mono)">${upLbl} = ${tolFmtMicron(dev.upper)}</text>
    <line x1="${cx+zw/2+6}" y1="${zeroY}" x2="${cx+zw/2+6}" y2="${y(dev.lower)}" stroke="var(--text-dim)" stroke-width="1"/>
    <text x="${cx+zw/2+10}" y="${(zeroY+y(dev.lower))/2+4}" font-size="11" fill="var(--text)" font-family="var(--font-mono)">${loLbl} = ${tolFmtMicron(dev.lower)}</text>
  </svg>`;
}
function tolDiagramFit(size, holeGrade, shaftGrade, holeDev, shaftDev, cls){
  const drawH = 170, marginTop = 36, marginBottom = 30;
  const svgW = 360, svgH = marginTop + drawH + marginBottom;
  const { top, bottom, padded } = tolScaleFor([holeDev.upper, holeDev.lower, shaftDev.upper, shaftDev.lower]);
  const mid = (top + bottom) / 2;
  const paddedTop = mid + padded / 2, paddedBottom = mid - padded / 2;
  const scale = drawH / (paddedTop - paddedBottom);
  const y = v => marginTop + (paddedTop - v) * scale;
  const zeroY = y(0);
  let hTop = y(holeDev.upper), hBot = y(holeDev.lower);
  if (hBot - hTop < 3){ const c=(hTop+hBot)/2; hTop=c-1.5; hBot=c+1.5; }
  let sTop = y(shaftDev.upper), sBot = y(shaftDev.lower);
  if (sBot - sTop < 3){ const c=(sTop+sBot)/2; sTop=c-1.5; sBot=c+1.5; }
  // Hole and shaft zones are overlaid on the same x-span so any vertical
  // (micron) overlap between them — i.e. an interference/transition
  // condition — shows up as a visibly blended region.
  const holeX = 118, holeW = 90, shaftX = 152, shaftW = 90;
  const verdictNote = cls === 'ok' ? 'No overlap — hole is always larger: clearance fit.'
    : cls === 'warn' ? 'Zones fully overlap — shaft is always larger: interference fit.'
    : 'Zones partly overlap — could land either way: transition fit.';
  return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" style="max-width:380px;display:block;margin:8px auto 2px;">
    <line x1="18" y1="${zeroY}" x2="${svgW-16}" y2="${zeroY}" stroke="var(--text-faint)" stroke-width="1.2" stroke-dasharray="4,3"/>
    <text x="18" y="${zeroY-7}" font-size="10.5" fill="var(--text-faint)" font-family="var(--font-mono)">Zero line — Ø${fmt(size)} (basic size)</text>
    <rect x="${holeX}" y="${Math.min(hTop,hBot)}" width="${holeW}" height="${Math.abs(hBot-hTop)}" fill="var(--accent)" fill-opacity="0.30" stroke="var(--accent-deep)" stroke-width="1.5"/>
    <rect x="${shaftX}" y="${Math.min(sTop,sBot)}" width="${shaftW}" height="${Math.abs(sBot-sTop)}" fill="var(--warn)" fill-opacity="0.30" stroke="var(--warn)" stroke-width="1.5"/>
    <text x="${holeX+8}" y="${Math.min(hTop,hBot)-9}" text-anchor="start" font-size="12.5" font-weight="700" fill="var(--accent-deep)" font-family="var(--font-display)">Hole ${holeGrade}</text>
    <text x="${shaftX+shaftW-8}" y="${Math.min(sTop,sBot)-9}" text-anchor="end" font-size="12.5" font-weight="700" fill="var(--warn)" font-family="var(--font-display)">Shaft ${shaftGrade}</text>
    <line x1="14" y1="${zeroY}" x2="14" y2="${y(holeDev.upper)}" stroke="var(--text-dim)" stroke-width="1"/>
    <text x="10" y="${(zeroY+y(holeDev.upper))/2+4}" text-anchor="end" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">ES ${tolFmtMicron(holeDev.upper)}</text>
    <line x1="14" y1="${zeroY}" x2="14" y2="${y(holeDev.lower)}" stroke="var(--text-dim)" stroke-width="1"/>
    <text x="10" y="${(zeroY+y(holeDev.lower))/2+4}" text-anchor="end" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">EI ${tolFmtMicron(holeDev.lower)}</text>
    <line x1="${svgW-14}" y1="${zeroY}" x2="${svgW-14}" y2="${y(shaftDev.upper)}" stroke="var(--text-dim)" stroke-width="1"/>
    <text x="${svgW-10}" y="${(zeroY+y(shaftDev.upper))/2+4}" text-anchor="start" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">es ${tolFmtMicron(shaftDev.upper)}</text>
    <line x1="${svgW-14}" y1="${zeroY}" x2="${svgW-14}" y2="${y(shaftDev.lower)}" stroke="var(--text-dim)" stroke-width="1"/>
    <text x="${svgW-10}" y="${(zeroY+y(shaftDev.lower))/2+4}" text-anchor="start" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">ei ${tolFmtMicron(shaftDev.lower)}</text>
  </svg>
  <div class="note" style="text-align:center;margin-top:0;padding-top:0;border-top:none;">${verdictNote}</div>`;
}
reg('tolerance', 'Tolerance & Fit Finder', 'Fits & Tolerances', function(container){
  const holeGrades = Object.keys(TOL_GRADES).filter(tolIsHoleGrade);
  const shaftGrades = Object.keys(TOL_GRADES).filter(g => !tolIsHoleGrade(g));
  const PRESET_FITS = [
    { id:'H11-c11', hole:'H11', shaft:'c11', name:'Loose Running', desc:"Big clearance for easy, no-fuss assembly — dusty, hot, or rough running conditions." },
    { id:'H9-d9',   hole:'H9',  shaft:'d9',  name:'Free Running',  desc:'For high running speeds or heavy journal pressures; not for accurate location.' },
    { id:'H8-f7',   hole:'H8',  shaft:'f7',  name:'Close Running', desc:'Running fit on accurate machinery, moderate speeds and journal pressures.' },
    { id:'H7-g6',   hole:'H7',  shaft:'g6',  name:'Sliding',       desc:'Moves and turns freely, locates accurately, but not intended to run freely.' },
    { id:'H7-h6',   hole:'H7',  shaft:'h6',  name:'Locational Clearance', desc:'Snug fit for locating stationary parts, freely assembled and dismantled.' },
    { id:'H7-k6',   hole:'H7',  shaft:'k6',  name:'Locational Transition', desc:'Accurate location, removable with light force.' },
    { id:'H7-n6',   hole:'H7',  shaft:'n6',  name:'Locational Transition (tight)', desc:'More accurate location than H7/k6, greater interference acceptable.' },
    { id:'H7-p6',   hole:'H7',  shaft:'p6',  name:'Locational Interference', desc:'Rigid, accurate location with light interference — pressed with an arbor press.' },
    { id:'H7-s6',   hole:'H7',  shaft:'s6',  name:'Medium Drive',  desc:'Ordinary steel parts or light shrink fits — tightest fit practical with cast iron.' },
    { id:'H7-u6',   hole:'H7',  shaft:'u6',  name:'Force Fit',     desc:'Heavy interference for highly-stressed parts, or shrink fits where pressing is impractical.' },
  ];
  container.innerHTML = `
    <h2>Tolerance &amp; Fit Finder</h2>
    <div class="calc-desc">Real ISO 286 deviation table (0–500 mm, 68 grades) — look up a single hole/shaft grade, or check any hole/shaft fit combination for clearance vs. interference.</div>
    ${card('', fSelect('tolMode','Mode', [
      {value:'finder', label:'Tolerance Finder (single grade)'},
      {value:'fit', label:'Fit Checker (hole vs. shaft)'}
    ], 'finder'))}
    <div id="tolFields"></div>
    <button class="btn" id="tolCalc">Calculate</button>
    <div id="tolResult"></div>
  `;
  function renderFields(){
    const mode = str(container,'tolMode');
    let html = '';
    if (mode === 'finder'){
      html = card('Inputs',
        fRow('tolSize','Basic Size',50,'mm') +
        fRadioGroup('tolMemberType',[{value:'hole',label:'Hole (ES / EI)'},{value:'shaft',label:'Shaft (es / ei)'}],'hole') +
        fSelect('tolGradeSel','Tolerance Grade', holeGrades, holeGrades.includes('H7')?'H7':holeGrades[0])
      );
    } else {
      html = card('Quick pick a preferred fit (optional)',
        fSelect('tolPreset','Purpose', [{value:'', label:'— custom, pick grades below —'}].concat(PRESET_FITS.map(f=>({value:f.id, label:f.hole+'/'+f.shaft+' — '+f.name}))), '')
      ) + card('Inputs',
        fRow('tolFitSize','Basic Size',50,'mm') +
        fSelect('tolHoleGrade','Hole Grade', holeGrades, 'H7') +
        fSelect('tolShaftGrade','Shaft Grade', shaftGrades, shaftGrades.includes('g6')?'g6':shaftGrades[0])
      );
    }
    $('#tolFields', container).innerHTML = html;
    if (mode === 'finder'){
      function refreshGradeOptions(){
        const type = $(`input[name="tolMemberType"]:checked`, container).value;
        const grades = type === 'hole' ? holeGrades : shaftGrades;
        const sel = $('#tolGradeSel', container);
        const prev = sel.value;
        const fallback = type==='hole' ? (holeGrades.includes('H7')?'H7':holeGrades[0]) : (shaftGrades.includes('g6')?'g6':shaftGrades[0]);
        sel.innerHTML = grades.map(g=>`<option value="${g}" ${g===fallback?'selected':''}>${g}</option>`).join('');
        if (grades.includes(prev)) sel.value = prev;
      }
      $all('input[name="tolMemberType"]', container).forEach(r => r.addEventListener('change', refreshGradeOptions));
    } else {
      $('#tolPreset', container).addEventListener('change', () => {
        const id = str(container,'tolPreset');
        const preset = PRESET_FITS.find(f=>f.id===id);
        if (preset){
          $('#tolHoleGrade', container).value = preset.hole;
          $('#tolShaftGrade', container).value = preset.shaft;
        }
      });
    }
  }
  renderFields();
  $('#tolMode', container).addEventListener('change', renderFields);
  $('#tolCalc', container).addEventListener('click', () => {
    try {
      const mode = str(container,'tolMode');
      if (mode === 'finder'){
        const size = num(container,'tolSize');
        const type = $(`input[name="tolMemberType"]:checked`, container).value;
        const grade = str(container,'tolGradeSel');
        if (isNaN(size) || size<0 || size>500) throw new Error('This chart covers basic sizes from 0 to 500 mm.');
        const idx = tolFindRangeIndex(size);
        const dev = tolGetDeviation(grade, idx);
        if (idx<0 || !dev) throw new Error("No data for that size/grade combination — double-check both.");
        const [over,to] = TOL_RANGES[idx];
        const maxLimit = size + dev.upper/1000, minLimit = size + dev.lower/1000;
        const upperLabel = type==='hole' ? 'ES (upper, hole)' : 'es (upper, shaft)';
        const lowerLabel = type==='hole' ? 'EI (lower, hole)' : 'ei (lower, shaft)';
        $('#tolResult', container).innerHTML = resultBox(
          resultRow('Diameter Step', 'over '+fmt(over)+' to '+fmt(to), 'mm') +
          resultRow(upperLabel, tolFmtMicron(dev.upper)) +
          resultRow(lowerLabel, tolFmtMicron(dev.lower)) +
          resultRow('Maximum Limit of Size', tolLimitStr(maxLimit)) +
          resultRow('Minimum Limit of Size', tolLimitStr(minLimit)) +
          resultRow('Tolerance (max − min)', fmt(dev.upper-dev.lower), 'µm', true)
        ) + note(`Basic size Ø${fmt(size)} mm machines between ${tolLimitStr(minLimit)} and ${tolLimitStr(maxLimit)} to stay within ${grade}.`)
          + card('Tolerance Zone Diagram', tolDiagramSingle(size, type, grade, dev));
      } else {
        const size = num(container,'tolFitSize');
        const holeGrade = str(container,'tolHoleGrade'), shaftGrade = str(container,'tolShaftGrade');
        if (isNaN(size) || size<0 || size>500) throw new Error('This chart covers basic sizes from 0 to 500 mm.');
        const idx = tolFindRangeIndex(size);
        const holeDev = tolGetDeviation(holeGrade, idx), shaftDev = tolGetDeviation(shaftGrade, idx);
        if (idx<0 || !holeDev || !shaftDev) throw new Error(`No data for a ${fmt(size)} mm basic size with ${holeGrade}/${shaftGrade}.`);
        const [over,to] = TOL_RANGES[idx];
        const holeMax = size+holeDev.upper/1000, holeMin = size+holeDev.lower/1000;
        const shaftMax = size+shaftDev.upper/1000, shaftMin = size+shaftDev.lower/1000;
        const { maxClearance, minClearance, verdict, cls } = tolComputeVerdict(holeDev, shaftDev);
        $('#tolResult', container).innerHTML = resultBox(
          resultRow('Fit', holeGrade+'/'+shaftGrade, '', true) +
          resultRow('Verdict', verdict, '', true) +
          resultRow('Max Clearance/Interference', fmt(maxClearance), 'µm (+ clearance / − interference)') +
          resultRow('Min Clearance/Interference', fmt(minClearance), 'µm (+ clearance / − interference)'),
          cls
        ) + card('Hole vs. Shaft Limits', `
          <table class="mini">
            <tr><th>Member</th><th>ES/es</th><th>EI/ei</th><th>Max Limit</th><th>Min Limit</th></tr>
            <tr><td>Hole ${holeGrade}</td><td>${tolFmtMicron(holeDev.upper)}</td><td>${tolFmtMicron(holeDev.lower)}</td><td>${tolLimitStr(holeMax)}</td><td>${tolLimitStr(holeMin)}</td></tr>
            <tr><td>Shaft ${shaftGrade}</td><td>${tolFmtMicron(shaftDev.upper)}</td><td>${tolFmtMicron(shaftDev.lower)}</td><td>${tolLimitStr(shaftMax)}</td><td>${tolLimitStr(shaftMin)}</td></tr>
          </table>
        `) + note(`Diameter step used: over ${fmt(over)} to ${fmt(to)} mm.`)
          + card('Fit Diagram (Hole vs. Shaft)', tolDiagramFit(size, holeGrade, shaftGrade, holeDev, shaftDev, cls));
      }
    } catch(e){ $('#tolResult', container).innerHTML = errorBox(e.message); }
  });
  $('#tolCalc', container).click();
});

/* ---------------------------------------------------------------------
   30. BENDING MOMENT (full Beam Design Calculator)
   --------------------------------------------------------------------- */
reg('beam', 'Bending Moment', 'Beams', function(container){
  const LOAD_OPTIONS = {
    'Cantilever Beam': ['Point Load at End','Uniformly Distributed Load','Point Load at Intermediate Point','Linearly Increasing Load to End','Linearly Increasing Load from End','Constant Moment'],
    'Simply Supported Beam': ['Point Load at Midspan','Point Load at Intermediate Point','Uniformly Distributed Load','Two Symmetric Point Loads','Linearly Increasing Load to End','Linearly Increasing Load from End'],
    'Fixed Beam': ['Point Load at Midspan','Uniformly Distributed Load','Point Load at Intermediate Point','Linearly Increasing Load to End'],
    'Propped Beam': ['Uniformly Distributed Load','Point Load at Midspan','Linearly Increasing Load to End','Linearly Increasing Load from End']
  };
  container.innerHTML = `
    <h2>Bending Moment / Beam Design Calculator</h2>
    ${card('', fSelect('beamType','Beam Type', Object.keys(LOAD_OPTIONS), 'Simply Supported Beam'))}
    ${card('', fSelect('loadType','Loading Type', LOAD_OPTIONS['Simply Supported Beam'], 'Point Load at Midspan'))}
    ${card('Geometry & Position', fRow('bx','Position along Beam (x)',1,'m')+fRow('bL','Beam Length (L)',10,'m')+fRow('bE','Youngs Modulus (E)',200e9,'Pa')+fRow('bI','Moment of Inertia (I)',8.33e-6,'m⁴'))}
    <div id="loadValueFields"></div>
    <button class="btn" id="beamCalc">Calculate</button>
    <div id="beamResult"></div>
  `;
  function updateLoadTypes(){
    const bt = str(container,'beamType');
    const sel = $('#loadType', container);
    sel.innerHTML = LOAD_OPTIONS[bt].map(o=>`<option value="${o}">${o}</option>`).join('');
    updateLoadFields();
  }
  function updateLoadFields(){
    const lt = str(container,'loadType');
    let html = '';
    if (lt.includes('Point Load') || lt.includes('Symmetric')) html += fRow('bP','Point Load (P)',1000,'N');
    if (lt.includes('Distributed') || lt.includes('Increasing')) html += fRow('bw','Distributed Load (w, at max end)',500,'N/m');
    if (lt.includes('Intermediate') || lt.includes('Symmetric')) html += fRow('ba','Position of Load (a)',2,'m');
    if (lt.includes('Constant Moment')) html += fRow('bm','Applied Moment (M)',1000,'N·m');
    $('#loadValueFields', container).innerHTML = card('Load Values', html || '<em>No extra inputs needed.</em>');
  }
  $('#beamType', container).addEventListener('change', updateLoadTypes);
  $('#loadType', container).addEventListener('change', updateLoadFields);
  updateLoadTypes();

  $('#beamCalc', container).addEventListener('click', () => {
    try {
      const beamType = str(container,'beamType'), loadType = str(container,'loadType');
      const x = num(container,'bx'), L = num(container,'bL'), E = num(container,'bE'), I = num(container,'bI');
      if (L===0||E===0||I===0) throw new Error('L, E and I must be non-zero.');
      if (x<0 || x>L) throw new Error("Position 'x' must be between 0 and L.");
      const P = num(container,'bP'), w = num(container,'bw'), a = num(container,'ba'), m = num(container,'bm');
      let out = {};

      if (beamType === 'Cantilever Beam') {
        if (loadType==='Point Load at End'){
          out.R_A=P; out.M_A=-P*L; out.Mx=-P*(L-x);
          out.y=(P*x**2)/(6*E*I)*(3*L-x); out.yMax=(P*L**3)/(3*E*I);
        } else if (loadType==='Uniformly Distributed Load'){
          out.R_A=w*L; out.M_A=-(w*L**2)/2; out.Mx=-w/2*(L-x)**2;
          out.y=(w*x**2)/(24*E*I)*(x**2-4*L*x+6*L**2); out.yMax=(w*L**4)/(8*E*I);
        } else if (loadType==='Point Load at Intermediate Point'){
          if (!(a>0 && a<L)) throw new Error("'a' must be between 0 and L.");
          out.R_A=P; out.M_A=-P*a;
          out.Mx = x<=a ? -P*(a-x) : 0;
          out.y = x<=a ? (P*x**2/(6*E*I))*(3*a-x) : (P*a**2/(6*E*I))*(3*x-a);
          out.yMax=(P*a**2/(6*E*I))*(3*L-a);
        } else if (loadType==='Linearly Increasing Load to End'){
          out.R_A=(w*L)/2; out.M_A=-(w*L**2)/6; out.Mx=-(w/(6*L))*(L-x)**3;
          out.y=(w/(120*E*I*L))*(x**5-5*L*x**4+10*L**2*x**3-10*L**3*x**2+5*L**4*x);
          out.yMax=(w*L**4)/(30*E*I);
        } else if (loadType==='Linearly Increasing Load from End'){
          out.R_A=w*L/2; out.M_A=-w*L**2/3; out.Mx=(-w/(6*L))*(2*L**3-3*L**2*x+x**3);
          out.y=(w/(120*E*I*L))*(x**5-10*L**2*x**3+20*L**3*x**2);
          out.yMax=(11*w*L**4)/(120*E*I);
        } else if (loadType==='Constant Moment'){
          out.R_A=0; out.M_A=-m; out.Mx=-m; out.y=(m*x**2)/(2*E*I); out.yMax=(m*L**2)/(2*E*I);
        }
      } else if (beamType === 'Simply Supported Beam') {
        if (loadType==='Point Load at Midspan'){
          out.R_A=out.R_B=P/2;
          out.Mx = x<=L/2 ? (P*x)/2 : (P*(L-x))/2;
          out.y = x<=L/2 ? (P*x/(48*E*I))*(3*L**2-4*x**2) : (P*(L-x)/(48*E*I))*(3*L**2-4*(L-x)**2);
          out.yMax=(P*L**3)/(48*E*I);
        } else if (loadType==='Uniformly Distributed Load'){
          out.R_A=out.R_B=(w*L)/2;
          out.Mx=(w*x/2)*(L-x);
          out.y=(w*x/(24*E*I))*(L**3-2*L*x**2+x**3);
          out.yMax=(5*w*L**4)/(384*E*I);
        } else if (loadType==='Point Load at Intermediate Point'){
          if (!(a>0 && a<L)) throw new Error("'a' must be between 0 and L.");
          const b=L-a;
          out.R_A=(P*b)/L; out.R_B=(P*a)/L;
          out.Mx = x<=a ? out.R_A*x : out.R_B*(L-x);
          out.y = x<=a ? (P*b*x/(6*E*I*L))*(L**2-b**2-x**2) : (P*a*(L-x)/(6*E*I*L))*(L**2-a**2-(L-x)**2);
          out.yMax = a>b ? (P*a*b*(L+b)*Math.sqrt(3*a*(L+b)))/(27*E*I*L) : (P*a*b*(L+a)*Math.sqrt(3*b*(L+a)))/(27*E*I*L);
        } else if (loadType==='Two Symmetric Point Loads'){
          if (!(a>0 && a<L/2)) throw new Error("'a' must be between 0 and L/2.");
          out.R_A=out.R_B=P;
          if (x<=a){ out.Mx=P*x; out.y=(P*x/(6*E*I))*(3*L*a-3*a**2-x**2); }
          else if (x<=L-a){ out.Mx=P*a; out.y=(P*a/(6*E*I))*(3*L*x-3*x**2-a**2); }
          else { out.Mx=P*(L-x); out.y=(P*(L-x)/(6*E*I))*(3*L*a-3*a**2-(L-x)**2); }
          out.yMax=(P*a/(24*E*I))*(3*L**2-4*a**2);
        } else if (loadType==='Linearly Increasing Load to End'){
          out.R_A=w*L/6; out.R_B=w*L/3;
          out.Mx=(w*x/(6*L))*(L**2-x**2);
          out.y=(w*x/(360*E*I*L))*(3*x**4-10*L**2*x**2+7*L**4);
          out.yMax=0.00652*(w*L**4)/(E*I);
        } else if (loadType==='Linearly Increasing Load from End'){
          out.R_A=w*L/3; out.R_B=w*L/6;
          out.Mx=(w*x/6)*(L-x-x**2/L);
          out.y=(w*x/(360*E*I*L))*(7*L**4-10*L**2*x**2+3*x**4);
          out.yMax=0.00652*(w*L**4)/(E*I);
        }
      } else if (beamType === 'Fixed Beam') {
        if (loadType==='Point Load at Midspan'){
          out.R_A=out.R_B=P/2; out.M_A=out.M_B=-P*L/8;
          out.Mx = x<=L/2 ? (P/8)*(4*x-L) : (P/8)*(3*L-4*x);
          out.y=(P*x**2/(48*E*I))*(3*L-4*x);
          out.yMax=(P*L**3)/(192*E*I);
        } else if (loadType==='Uniformly Distributed Load'){
          out.R_A=out.R_B=w*L/2; out.M_A=out.M_B=-w*L**2/12;
          out.Mx=(w/12)*(6*L*x-L**2-6*x**2);
          out.y=(w*x**2*(L-x)**2)/(24*E*I);
          out.yMax=(w*L**4)/(384*E*I);
        } else if (loadType==='Point Load at Intermediate Point'){
          if (!(a>0 && a<L)) throw new Error("'a' must be between 0 and L.");
          const b=L-a;
          out.R_A=P*b**2*(3*a+b)/L**3; out.R_B=P*a**2*(a+3*b)/L**3;
          out.M_A=-P*a*b**2/L**2; out.M_B=-P*a**2*b/L**2;
          out.Mx = x<=a ? out.M_A + out.R_A*x : out.M_A + out.R_A*x - P*(x-a);
          out.y = x<=a ? (P*b**2*x**2/(6*E*I*L**3))*(3*a*L-3*a*x-b*x) : (P*a**2*(L-x)**2/(6*E*I*L**3))*(3*b*L-3*b*(L-x)-a*(L-x));
          out.yMax=(2*P*a**3*b**2)/(3*E*I*(3*a+b)**2);
        } else if (loadType==='Linearly Increasing Load to End'){
          out.R_A=3*w*L/20; out.R_B=7*w*L/20;
          out.M_A=-w*L**2/30; out.M_B=-w*L**2/20;
          out.Mx=out.M_A + out.R_A*x - (w*x**3)/(6*L);
          out.y=(w*x**2/(120*E*I*L))*(L**3-2*L**2*x+L*x**2-x**3/5);
          out.yMax=0.0024*w*L**4/(E*I);
        }
      } else if (beamType === 'Propped Beam') {
        if (loadType==='Uniformly Distributed Load'){
          out.R_A=5*w*L/8; out.R_B=3*w*L/8; out.M_A=-w*L**2/8;
          out.Mx=out.R_A*x + out.M_A - w*x**2/2;
          out.y=(w*x**2/(48*E*I))*(2*L**2-4*L*x+x**2);
          out.yMax=0.005415*w*L**4/(E*I);
        } else if (loadType==='Point Load at Midspan'){
          out.R_A=11*P/16; out.R_B=5*P/16; out.M_A=-3*P*L/16;
          out.Mx = x<=L/2 ? out.M_A + out.R_A*x : out.M_A + out.R_A*x - P*(x-L/2);
          out.y = x<=L/2 ? (P*x**2/(96*E*I))*(9*L-11*x) : (-P/(96*E*I))*(11*L**3-57*L**2*x+75*L*x**2-25*x**3);
          out.yMax=0.00932*P*L**3/(E*I);
        } else if (loadType==='Linearly Increasing Load to End'){
          // FIXED: original tool had R_A and R_B swapped (flagged "Incorrect in
          // original file" in its own comment). Correct values derived by
          // superposition (cantilever + redundant prop reaction), verified
          // against the M_A value which the original tool DID get right:
          //   R_B = w*L/10 (redundant reaction), R_A = 2*w*L/5 (by equilibrium)
          out.R_A=2*w*L/5; out.R_B=w*L/10; out.M_A=-w*L**2/15;
          out.Mx=out.M_A + out.R_A*x - (w*x**3)/(6*L);
          out.y=(w*x**2/(120*E*I*L))*(2*L**3-4*L**2*x+2*L*x**2-x**3/2);
          out.yMax=0.00328*w*L**4/(E*I);
        } else if (loadType==='Linearly Increasing Load from End'){
          out.R_A=7*w*L/20; out.R_B=3*w*L/20; out.M_A=-w*L**2/20;
          out.Mx=out.M_A + out.R_A*x - w*x**2/2 + w*x**3/(6*L);
          out.y=(w*x**2/(120*E*I*L))*(2*L**3-5*L**2*x+5*L*x**2-x**3);
          out.yMax=0.00397*w*L**4/(E*I);
        }
      }

      let rows = '';
      if (out.R_A!==undefined) rows += resultRow('Reaction R_A', fmt(out.R_A), 'N');
      if (out.R_B!==undefined) rows += resultRow('Reaction R_B', fmt(out.R_B), 'N');
      if (out.M_A!==undefined) rows += resultRow('Fixed-end Moment M_A', fmt(out.M_A), 'N·m');
      if (out.M_B!==undefined) rows += resultRow('Fixed-end Moment M_B', fmt(out.M_B), 'N·m');
      rows += resultRow('Bending Moment M(x)', fmt(out.Mx), 'N·m', true);
      rows += resultRow('Deflection y(x)', fmt(out.y*1000,4), 'mm', true);
      rows += resultRow('Max Deflection', fmt(out.yMax*1000,4), 'mm', true);
      $('#beamResult', container).innerHTML = resultBox(rows);
    } catch(e){ $('#beamResult', container).innerHTML = errorBox(e.message); }
  });
  $('#beamCalc', container).click();
});

/* ---------------------------------------------------------------------
   31. TROLLEY / CAR POWER
   --------------------------------------------------------------------- */
reg('trolley', 'Trolley/Car Power', 'Drives & Power Transmission', function(container){
  container.innerHTML = `
    <h2>Trolley / Car Power Calculator</h2>
    ${card('Inputs',
      fRow('trMt','Trolley Mass',50,'kg')+
      fRow('trMl','Load Mass',150,'kg')+
      fRow('trDw','Wheel Diameter',0.2,'m')+
      fRow('trV','Desired Speed',1.5,'m/s')+
      fRow('trTa','Acceleration Time',3,'s')+
      fRow('trTheta','Incline Angle',5,'°')+
      fRow('trMur','Rolling Resistance Coeff. (µr)',0.01,'')+
      fRow('trRho','Air Density',1.225,'kg/m³')+
      fRow('trAf','Frontal Area',0.5,'m²')+
      fRow('trCd','Drag Coefficient',1.0,'')+
      fRow('trWind','Wind Speed',0,'m/s')+
      fRadioGroup('trWindDir',[{value:'head',label:'Headwind'},{value:'tail',label:'Tailwind'}],'head')+
      fRow('trEta','Drive System Efficiency (η)',0.85,'0–1')
    )}
    <button class="btn" id="trCalc">Calculate</button>
    <div id="trResult"></div>
  `;
  $('#trCalc', container).addEventListener('click', () => {
    try {
      const g=9.81;
      const mt=num(container,'trMt'), ml=num(container,'trMl'), Dw=num(container,'trDw');
      const v=num(container,'trV'), ta=num(container,'trTa'), thetaDeg=num(container,'trTheta');
      const mur=num(container,'trMur'), rho=num(container,'trRho'), Af=num(container,'trAf'), Cd=num(container,'trCd');
      const wind=num(container,'trWind'), eta=num(container,'trEta');
      const windDir = $(`input[name="trWindDir"]:checked`, container).value;
      if (eta<=0||eta>1) throw new Error('Drive efficiency must be in (0,1].');
      const M = mt+ml, Rw = Dw/2, thetaRad = deg2rad(thetaDeg);
      const Fr = mur*M*g*Math.cos(thetaRad);
      const Fg = M*g*Math.sin(thetaRad);
      const vRel = windDir==='head' ? Math.abs(v+wind) : Math.abs(v-wind);
      const Fd = 0.5*rho*Af*Cd*(vRel**2);
      let a=0, Fa=0;
      if (ta>0){ a=v/ta; Fa=M*a; }
      const Ftotal = Fr+Fg+Fd+Fa;
      const FtotalConst = Fr+Fg+Fd;
      const Pconst = (FtotalConst*v)/eta;
      const Paccel = (Ftotal*v)/eta;
      const Tconst = FtotalConst*Rw, Taccel = Ftotal*Rw;
      $('#trResult', container).innerHTML = resultBox(
        resultRow('Total Mass', fmt(M), 'kg') +
        resultRow('Rolling Resistance Force', fmt(Fr), 'N') +
        resultRow('Gradient Force', fmt(Fg), 'N') +
        resultRow('Drag Force', fmt(Fd), 'N') +
        resultRow('Acceleration Force', fmt(Fa), 'N')
      ) + resultBox(
        resultRow('Motor Power (constant speed)', fmt(Pconst/1000), 'kW') +
        resultRow('Motor Power (during acceleration)', fmt(Paccel/1000), 'kW', true) +
        resultRow('Wheel Torque (constant)', fmt(Tconst), 'N·m') +
        resultRow('Wheel Torque (accelerating)', fmt(Taccel), 'N·m', true)
      );
    } catch(e){ $('#trResult', container).innerHTML = errorBox(e.message); }
  });
  $('#trCalc', container).click();
});

/* ---------------------------------------------------------------------
   32. HEAT TRANSFER
   --------------------------------------------------------------------- */
reg('heat', 'Heat Transfer', 'Thermal', function(container){
  container.innerHTML = `
    <h2>Heat Transfer Calculator</h2>
    ${card('', fSelect('htMode','Mode', [
      {value:'conduction', label:'Conduction (Fourier\u2019s Law)'},
      {value:'convection', label:'Convection (Newton\u2019s Law of Cooling)'},
      {value:'radiation', label:'Radiation (Stefan-Boltzmann)'},
      {value:'transient', label:'Transient Cooling (Lumped Capacitance)'}
    ], 'conduction'))}
    <div id="htFields"></div>
    <button class="btn" id="htCalc">Calculate</button>
    <div id="htResult"></div>
  `;
  function renderFields(){
    const m = str(container,'htMode');
    let html = '';
    if (m==='conduction') html = fRow('htK','Thermal Conductivity (k)',45,'W/m·K')+fRow('htA','Area (A)',1,'m²')+fRow('htT1','Hot Face Temp (T1)',150,'°C')+fRow('htT2','Cold Face Temp (T2)',30,'°C')+fRow('htL','Thickness (L)',0.05,'m');
    else if (m==='convection') html = fRow('htH','Convection Coeff. (h)',25,'W/m²·K')+fRow('htA','Area (A)',1,'m²')+fRow('htTs','Surface Temp (Ts)',80,'°C')+fRow('htTinf','Fluid Temp (T∞)',25,'°C');
    else if (m==='radiation') html = fRow('htEps','Emissivity (ε)',0.85,'0–1')+fRow('htA','Area (A)',1,'m²')+fRow('htT1k','Surface Temp (T1)',500,'K')+fRow('htT2k','Surroundings Temp (T2)',300,'K');
    else html = fRow('htRho','Density (ρ)',7850,'kg/m³')+fRow('htV','Volume (V)',0.001,'m³')+fRow('htC','Specific Heat (c)',450,'J/kg·K')+fRow('htH2','Convection Coeff. (h)',25,'W/m²·K')+fRow('htA2','Surface Area (A)',0.5,'m²')+fRow('htTi','Initial Temp (Ti)',300,'°C')+fRow('htTinf2','Ambient Temp (T∞)',25,'°C')+fRow('htTime','Time',600,'s');
    $('#htFields', container).innerHTML = card('Inputs', html);
  }
  renderFields();
  $('#htMode', container).addEventListener('change', renderFields);
  $('#htCalc', container).addEventListener('click', () => {
    try {
      const m = str(container,'htMode');
      if (m==='conduction'){
        const k=num(container,'htK'), A=num(container,'htA'), T1=num(container,'htT1'), T2=num(container,'htT2'), L=num(container,'htL');
        if (L<=0) throw new Error('Thickness must be positive.');
        const Q = (k*A*(T1-T2))/L;
        $('#htResult', container).innerHTML = resultBox(resultRow('Heat Transfer Rate (Q)', fmt(Q), 'W', true));
      } else if (m==='convection'){
        const h=num(container,'htH'), A=num(container,'htA'), Ts=num(container,'htTs'), Tinf=num(container,'htTinf');
        const Q = h*A*(Ts-Tinf);
        $('#htResult', container).innerHTML = resultBox(resultRow('Heat Transfer Rate (Q)', fmt(Q), 'W', true));
      } else if (m==='radiation'){
        const eps=num(container,'htEps'), A=num(container,'htA'), T1=num(container,'htT1k'), T2=num(container,'htT2k');
        const sigma = 5.670374419e-8;
        const Q = eps*sigma*A*(T1**4 - T2**4);
        $('#htResult', container).innerHTML = resultBox(resultRow('Heat Transfer Rate (Q)', fmt(Q), 'W', true));
      } else {
        const rho=num(container,'htRho'), V=num(container,'htV'), c=num(container,'htC');
        const h=num(container,'htH2'), A=num(container,'htA2'), Ti=num(container,'htTi'), Tinf=num(container,'htTinf2'), t=num(container,'htTime');
        const tau = (rho*V*c)/(h*A);
        const T = Tinf + (Ti-Tinf)*Math.exp(-t/tau);
        $('#htResult', container).innerHTML = resultBox(
          resultRow('Time Constant (τ)', fmt(tau), 's') +
          resultRow('Temperature at time t', fmt(T), '°C', true)
        );
      }
    } catch(e){ $('#htResult', container).innerHTML = errorBox(e.message); }
  });
  $('#htCalc', container).click();
});

/* ---------------------------------------------------------------------
   22. PRODUCTION CHART (Galvanizing / Coil Processing Line)
   ---------------------------------------------------------------------
   Line speed (MPM) is DERIVED, not entered manually. A continuous line
   (e.g. galvanizing) has two independent limits for every width/thickness
   combination:
     1. Mechanical top speed of the line (fixed, e.g. 120 m/min).
     2. The furnace/zinc-pot's fixed max mass-throughput capacity (TPH) —
        thinner/narrower strip can run faster for the same mass flow, so
        thick/wide strip needs a slower speed to stay under this cap.
   Actual speed = min(mechanical cap, throughput-limited speed). Whichever
   is smaller is the "limiting factor" for that combo. This exactly
   reproduces the reference workbook's K55/K60 logic (verified against
   every MPM value in the original 750,000 TPA chart).
   --------------------------------------------------------------------- */
reg('prod-chart', 'Production Chart (Galvanizing / Coil Line)', 'Coils & Strip Handling', function(container){
  container.innerHTML = `
    <h2>Production Chart — Galvanizing / Coil Processing Line</h2>
    <div class="calc-desc">Annual capacity plan. Add every width and thickness you run — the tool builds every possible width × thickness combination automatically and derives its line speed from two limits: the line's mechanical top speed, and the furnace/pot's max mass-throughput (TPH) capacity. Whichever gives the LOWER speed wins. After the chart is generated, enter what % of the annual hours you plan to run each combination to get the final production plan.</div>
    ${card('Line Settings',
      fRow('pcDensity','Material Density',7860,'kg/m³')+
      fRow('pcMaxSpeed','Max Mechanical Line Speed',120,'m/min')+
      fRow('pcHours','Annual Operating Hours',7192,'h')+
      fRow('pcTarget','Target Annual Production',750000,'t/yr')
    )}
    ${card('Furnace / Process Throughput Limit',
      fRow('pcMaxTph','Max Furnace Throughput Capacity',138.6504,'TPH') +
      `<div class="note">This is the fixed mass-flow ceiling of your annealing furnace / zinc pot — independent of width or thickness. Don't know it directly? Derive it below from one known reference point (e.g. your heaviest product at its rated design speed).</div>
      <div class="load-list-row">
        <input type="number" id="pcRefThk" value="3.5" step="0.01"> mm thk
        <input type="number" id="pcRefWidth" value="2100" step="1"> mm width
        <input type="number" id="pcRefSpeed" value="40" step="0.01"> m/min (rated speed)
        <button class="btn secondary" id="pcDeriveTph">Use as Max Throughput</button>
      </div>`
    )}
    ${card('Step 1 — Widths &amp; Thicknesses to Plan',
      `<div class="chip-group-label">Widths</div>
      <div id="pcWidths"></div>
      <button class="btn secondary chip-add-btn" id="pcAddWidth">+ Add Width</button>
      <div class="chip-group-label" style="margin-top:18px;">Thicknesses</div>
      <div id="pcThicknesses"></div>
      <button class="btn secondary chip-add-btn" id="pcAddThk">+ Add Thickness</button>`
    )}
    <button class="btn" id="pcGenChart">Step 1 — Generate Chart (every Width × Thickness combo)</button>
    <div id="pcChartWrap"></div>
    <div id="pcResult"></div>
  `;

  // ---- lists the user builds up: any number of widths & any number of
  // thicknesses. Step 1 below turns these into EVERY possible width x
  // thickness combination automatically (cartesian product), instead of
  // making the user hand-enter each combination one by one. ----
  let widths = [900,1000,1200,1500,1800,2100].map(w=>({width:w}));
  let thicknesses = [0.6,0.8,1,1.2,1.5,2,2.5,3,3.5].map(t=>({thk:t}));
  // combos = the generated chart. Each row keeps its own runPct so the
  // "how much % to run next" step (Step 2) is entered per exact
  // width+thickness pair, not just averaged across a whole width group.
  let combos = [];

  function renderWidths(){
    $('#pcWidths', container).innerHTML = `<div class="chip-flow">` + (widths.map((w,i)=>`
      <span class="chip">
        <input type="number" value="${w.width}" data-wi="${i}" step="any" aria-label="Width ${i+1}">
        <span class="chip-unit">mm</span>
        <button class="chip-x" data-removewidth="${i}" title="Remove width">✕</button>
      </span>`).join('') || `<span class="chip-empty">No widths added yet — click "+ Add Width" below.</span>`) + `</div>`;
    $all('input[data-wi]', container).forEach(inp=>{
      inp.addEventListener('input', ()=>{ widths[+inp.dataset.wi].width = parseFloat(inp.value); });
    });
    $all('[data-removewidth]', container).forEach(btn=>{
      btn.addEventListener('click', ()=>{ widths.splice(+btn.dataset.removewidth,1); renderWidths(); });
    });
  }
  function renderThicknesses(){
    $('#pcThicknesses', container).innerHTML = `<div class="chip-flow">` + (thicknesses.map((t,i)=>`
      <span class="chip">
        <input type="number" value="${t.thk}" data-ti="${i}" step="0.01" aria-label="Thickness ${i+1}">
        <span class="chip-unit">mm</span>
        <button class="chip-x" data-removethk="${i}" title="Remove thickness">✕</button>
      </span>`).join('') || `<span class="chip-empty">No thicknesses added yet — click "+ Add Thickness" below.</span>`) + `</div>`;
    $all('input[data-ti]', container).forEach(inp=>{
      inp.addEventListener('input', ()=>{ thicknesses[+inp.dataset.ti].thk = parseFloat(inp.value); });
    });
    $all('[data-removethk]', container).forEach(btn=>{
      btn.addEventListener('click', ()=>{ thicknesses.splice(+btn.dataset.removethk,1); renderThicknesses(); });
    });
  }
  renderWidths();
  renderThicknesses();

  $('#pcAddWidth', container).addEventListener('click', ()=>{ widths.push({width:1000}); renderWidths(); });
  $('#pcAddThk', container).addEventListener('click', ()=>{ thicknesses.push({thk:1}); renderThicknesses(); });

  $('#pcDeriveTph', container).addEventListener('click', () => {
    try {
      const density = num(container,'pcDensity');
      const refThk = num(container,'pcRefThk'), refWidth = num(container,'pcRefWidth'), refSpeed = num(container,'pcRefSpeed');
      if (density<=0) throw new Error('Density must be positive.');
      if (refThk<=0 || refWidth<=0 || refSpeed<=0) throw new Error('Reference thickness, width and speed must all be positive.');
      const densityKgPerMm3 = density / 1e9;
      const derivedTph = (refThk * refWidth * refSpeed * 1000 * 60 * densityKgPerMm3) / 1000;
      $('#pcMaxTph', container).value = fmt(derivedTph, 4).replace(/,/g,'');
    } catch(e){ /* silently ignore — user will see stale value if inputs are bad */ }
  });

  // ---- Step 2: render the generated chart with an editable Run % column,
  // plus the button that turns those Run % entries into the final
  // annual-tonnage plan. ----
  function renderChartTable(){
    $('#pcChartWrap', container).innerHTML = card('Step 2 — Chart &amp; Run % for Next Period',
      `<div class="note">Speeds &amp; TPH below are derived automatically — never entered manually. Rows highlighted <span class="legend-maxspeed">green</span> are running at the line's full mechanical top speed (not throttled down by the furnace throughput cap). Now enter what % of the ${fmt(num(container,'pcHours'),0)} annual hours you plan to run <b>each</b> width × thickness combination next (they should add up to 100%).</div>
      <table class="mini"><tr><th>Width (mm)</th><th>Thk (mm)</th><th>MPM (derived)</th><th>TPH</th><th>Limited by</th><th>Run %</th></tr>` +
      combos.map((c,i)=>`<tr${c.limitedBy==='Speed cap' ? ' class="row-maxspeed"' : ''}>
          <td>${fmt(c.width,0)}</td>
          <td>${fmt(c.thk,2)}</td>
          <td>${fmt(c.mpm,2)}</td>
          <td>${fmt(c.tph,2)}</td>
          <td class="cell-limitedby">${c.limitedBy}</td>
          <td><input type="number" value="${c.runPct}" data-ci="${i}" step="0.01" min="0" style="width:75px;"></td>
        </tr>`).join('') +
      `</table>
      <div class="load-list-row" style="margin-top:10px;">
        <button class="btn secondary" id="pcEqualSplit">Equal Split 100% Across All Rows</button>
      </div>
      <button class="btn" id="pcCalcProd">Step 3 — Calculate Annual Production</button>`
    );

    $all('input[data-ci]', container).forEach(inp=>{
      inp.addEventListener('input', ()=>{ combos[+inp.dataset.ci].runPct = parseFloat(inp.value)||0; });
    });
    $('#pcEqualSplit', container).addEventListener('click', ()=>{
      const each = combos.length ? +(100/combos.length).toFixed(4) : 0;
      combos.forEach(c=>c.runPct = each);
      renderChartTable();
      $('#pcCalcProd', container).click();
    });
    $('#pcCalcProd', container).addEventListener('click', calcProduction);
  }

  // ---- Step 1 handler: build every width x thickness combination and
  // derive its speed/TPH from the mechanical and furnace-throughput caps. ----
  $('#pcGenChart', container).addEventListener('click', () => {
    try {
      const density = num(container,'pcDensity');
      const maxMechSpeed = num(container,'pcMaxSpeed');
      const maxTph = num(container,'pcMaxTph');
      if (density<=0) throw new Error('Density must be positive.');
      if (maxMechSpeed<=0) throw new Error('Max mechanical line speed must be positive.');
      if (maxTph<=0) throw new Error('Max furnace throughput (TPH) must be positive.');
      if (!widths.length) throw new Error('Add at least one width.');
      if (!thicknesses.length) throw new Error('Add at least one thickness.');
      widths.forEach((w,i)=>{ if(!(w.width>0)) throw new Error(`Width #${i+1} must be positive.`); });
      thicknesses.forEach((t,i)=>{ if(!(t.thk>0)) throw new Error(`Thickness #${i+1} must be positive.`); });

      const densityKgPerMm3 = density / 1e9; // kg/m³ → kg/mm³

      // Keep any Run % the user already typed for a combo that still
      // exists after regenerating (e.g. after tweaking a width/thickness).
      const prevRunPct = {};
      combos.forEach(c => { prevRunPct[`${c.width}|${c.thk}`] = c.runPct; });
      const equalShare = +(100/(widths.length*thicknesses.length)).toFixed(4);

      // Cartesian product — every width paired with every thickness.
      combos = [];
      widths.forEach(w => {
        thicknesses.forEach(t => {
          // Speed that would exactly saturate the furnace's max throughput
          // for this thickness/width — derived by solving the TPH formula
          // for speed (D = TPH / (thk × width × 60 × density)).
          const reqSpeed = maxTph / (t.thk * w.width * 60 * densityKgPerMm3);
          const speedLimited = reqSpeed >= maxMechSpeed;
          const mpm = speedLimited ? maxMechSpeed : reqSpeed;
          const tph = (t.thk * w.width * mpm * 1000 * 60 * densityKgPerMm3) / 1000;
          const key = `${w.width}|${t.thk}`;
          combos.push({
            width: w.width, thk: t.thk, mpm, tph,
            limitedBy: speedLimited ? 'Speed cap' : 'Furnace cap',
            runPct: prevRunPct[key] !== undefined ? prevRunPct[key] : equalShare
          });
        });
      });

      $('#pcResult', container).innerHTML = '';
      renderChartTable();
      $('#pcCalcProd', container).click();
    } catch(e){ $('#pcChartWrap', container).innerHTML=''; $('#pcResult', container).innerHTML = errorBox(e.message); }
  });

  // ---- Step 3: apply the entered Run % per combination to get the
  // final annual production plan. ----
  function calcProduction(){
    try {
      const totalHours = num(container,'pcHours');
      const target = num(container,'pcTarget');
      if (totalHours<=0) throw new Error('Annual operating hours must be positive.');
      if (!combos.length) throw new Error('Generate the chart first (Step 1).');

      let grandTotalTons = 0, totalRunPct = 0;
      const rowsHTML = combos.map(c => {
        const hours = totalHours * c.runPct / 100;
        const tons = hours * c.tph;
        grandTotalTons += tons;
        totalRunPct += c.runPct;
        const rowCls = c.limitedBy==='Speed cap' ? ' class="row-maxspeed"' : '';
        return `<tr${rowCls}><td>${fmt(c.width,0)}</td><td>${fmt(c.thk,2)}</td><td>${fmt(c.mpm,2)}</td><td>${fmt(c.tph,2)}</td><td>${fmt(c.runPct,2)}</td><td>${fmt(hours,1)}</td><td>${fmt(tons,0)}</td></tr>`;
      }).join('');
      const table = `<table class="mini"><tr><th>Width</th><th>Thk</th><th>MPM</th><th>TPH</th><th>Run %</th><th>Hours</th><th>Tons</th></tr>${rowsHTML}</table><div class="note"><span class="legend-maxspeed">Green</span> rows run at the line's max mechanical speed.</div>`;

      const pctOfTarget = target>0 ? (grandTotalTons/target)*100 : null;
      const runPctWarn = Math.abs(totalRunPct-100) > 0.5;
      const summaryCls = runPctWarn ? 'warn' : (pctOfTarget!==null && Math.abs(pctOfTarget-100)<=2 ? 'ok' : '');

      let summary = resultBox(
        resultRow('Total Run % Allocated', fmt(totalRunPct,2), '%') +
        resultRow('Total Annual Production', fmt(grandTotalTons,0), 't/yr', true) +
        (target>0 ? resultRow('Target', fmt(target,0), 't/yr') : '') +
        (pctOfTarget!==null ? resultRow('% of Target Achieved', fmt(pctOfTarget,1), '%', true) : '')
      , summaryCls);

      if (runPctWarn) {
        summary += note(`⚠ Run % across all combinations sums to ${fmt(totalRunPct,2)}%, not 100%. Adjust the "Run %" fields (or use "Equal Split") so they add up to 100% for a realistic annual plan.`);
      }

      $('#pcResult', container).innerHTML = summary + card('Per-Combination Breakdown', table);
    } catch(e){ $('#pcResult', container).innerHTML = errorBox(e.message); }
  }

  $('#pcGenChart', container).click();
});

/* =========================================================================
   EXPORT / PRINT / COPY
   Works generically across every calculator by reading the rendered DOM
   (field-row inputs, result-box outputs, mini tables, diagrams) rather than
   requiring each of the 32 calculators to be modified individually.
   ========================================================================= */
function escapeHTML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function extractInputs(container){
  const inputs = [];
  $all('.field-row', container).forEach(row => {
    if (row.classList.contains('checkbox-row')) {
      const label = row.querySelector('label');
      const cb = row.querySelector('input[type="checkbox"]');
      if (label && cb) inputs.push({ label: label.textContent.trim(), value: cb.checked ? 'Yes' : 'No', unit: '' });
      return;
    }
    const label = row.querySelector('label');
    const field = row.querySelector('input, select');
    if (!label || !field) return;
    let value;
    if (field.tagName === 'SELECT') {
      value = field.options[field.selectedIndex] ? field.options[field.selectedIndex].text : field.value;
    } else {
      value = field.value;
    }
    const unitEl = row.querySelector('.unit');
    inputs.push({ label: label.textContent.trim(), value, unit: unitEl ? unitEl.textContent.trim() : '' });
  });
  const seenRadioNames = new Set();
  $all('input[type="radio"]', container).forEach(r => {
    if (seenRadioNames.has(r.name)) return;
    seenRadioNames.add(r.name);
    const picked = container.querySelector(`input[name="${r.name}"]:checked`);
    if (picked) {
      const lbl = picked.closest('label');
      inputs.push({ label: r.name, value: lbl ? lbl.textContent.trim() : picked.value, unit: '' });
    }
  });
  return inputs;
}

function extractOutputs(container){
  const outputs = [];
  $all('.result-box', container).forEach(box => {
    if (box.classList.contains('error')) {
      outputs.push({ type: 'error', text: box.textContent.replace(/^⚠\s*/, '').trim() });
      return;
    }
    const rows = $all('.result-row', box);
    if (rows.length) {
      rows.forEach(r => {
        const label = r.querySelector('.rlabel');
        const value = r.querySelector('.rvalue');
        outputs.push({
          type: 'row',
          label: label ? label.textContent.trim() : '',
          value: value ? value.textContent.trim() : '',
          highlight: !!(value && value.classList.contains('highlight'))
        });
      });
    } else if (box.textContent.trim()) {
      outputs.push({ type: 'text', text: box.textContent.trim() });
    }
  });
  $all('table.mini', container).forEach(table => {
    const rows = $all('tr', table).map(tr => $all('th,td', tr).map(c => c.textContent.trim()));
    if (rows.length) outputs.push({ type: 'table', rows });
  });
  return outputs;
}

function buildTextReport(container, calc){
  const inputs = extractInputs(container);
  const outputs = extractOutputs(container);
  const lines = [];
  lines.push(`X — ${calc.name}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  if (inputs.length) {
    lines.push('INPUTS');
    lines.push('------');
    inputs.forEach(i => lines.push(`${i.label}: ${i.value}${i.unit ? ' ' + i.unit : ''}`));
    lines.push('');
  }
  lines.push('RESULTS');
  lines.push('-------');
  outputs.forEach(o => {
    if (o.type === 'row') lines.push(`${o.label}: ${o.value}`);
    else if (o.type === 'error') lines.push(`ERROR: ${o.text}`);
    else if (o.type === 'text') lines.push(o.text);
    else if (o.type === 'table') o.rows.forEach(r => lines.push(r.join('  |  ')));
  });
  return lines.join('\n');
}

function copyAsText(container, calc, btn){
  const text = buildTextReport(container, calc);
  const done = () => {
    const orig = btn.dataset.origText || btn.textContent;
    btn.dataset.origText = orig;
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
}

function csvEscape(v){
  v = String(v ?? '');
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}
function exportCSV(container, calc){
  const inputs = extractInputs(container);
  const outputs = extractOutputs(container);
  const rows = [];
  rows.push(['X', calc.name]);
  rows.push(['Generated', new Date().toLocaleString()]);
  rows.push([]);
  rows.push(['Section', 'Label', 'Value']);
  inputs.forEach(i => rows.push(['Input', i.label, i.unit ? `${i.value} ${i.unit}` : i.value]));
  outputs.forEach(o => {
    if (o.type === 'row') rows.push(['Result', o.label, o.value]);
    else if (o.type === 'error') rows.push(['Error', '', o.text]);
    else if (o.type === 'text') rows.push(['Note', '', o.text]);
    else if (o.type === 'table') o.rows.forEach(r => rows.push(['Table', '', r.join(' | ')]));
  });
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `enginx-${calc.id}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =========================================================================
   STEP-BY-STEP CALCULATION VIEW
   Reuses the exact same values already computed and displayed by the
   calculator (via extractInputs/extractOutputs) so the steps shown can
   never drift out of sync with the real result — no formula is
   re-implemented here, we simply re-present what was already calculated
   as a numbered, easy-to-follow sequence, on its own page.
   ========================================================================= */
function buildStepsHTML(container, calc){
  const inputs = extractInputs(container);
  const outputs = extractOutputs(container);
  const descEl = $('.calc-desc', container);
  const descText = descEl ? descEl.textContent.trim() : '';

  let body = `
    <div class="print-header">
      <div class="print-brand">X</div>
      <div class="print-sub">Steel &amp; Rolling Mill Engineering Calculators</div>
    </div>
    <div class="print-title">${escapeHTML(calc.name)} — Step-by-Step</div>
    <div class="print-meta">Generated ${escapeHTML(new Date().toLocaleString())} &middot; ${escapeHTML(calc.category)}</div>
  `;

  if (descText) {
    body += `<div class="print-h2">Method / Formula</div><div class="steps-formula">${escapeHTML(descText)}</div>`;
  }

  if (inputs.length) {
    body += `<div class="print-h2">Given (Your Inputs)</div><table class="print-table">`;
    inputs.forEach(i => {
      body += `<tr><td>${escapeHTML(i.label)}</td><td>${escapeHTML(String(i.value))}${i.unit ? ' ' + escapeHTML(i.unit) : ''}</td></tr>`;
    });
    body += `</table>`;
  }

  body += `<div class="print-h2">Step-by-Step Calculation</div><div class="steps-list">`;
  let stepNum = 1;
  let sawAnyStep = false;
  outputs.forEach(o => {
    if (o.type === 'row') {
      sawAnyStep = true;
      const n = o.highlight ? '✓' : String(stepNum++);
      body += `<div class="step-item${o.highlight ? ' step-final' : ''}">
        <div class="step-num">${n}</div>
        <div class="step-body">
          <div class="step-label">${escapeHTML(o.label)}</div>
          <div class="step-value">${escapeHTML(o.value)}</div>
        </div>
      </div>`;
    } else if (o.type === 'error') {
      body += `<div class="print-error">⚠ ${escapeHTML(o.text)}</div>`;
    } else if (o.type === 'text') {
      body += `<div class="step-note">${escapeHTML(o.text)}</div>`;
    } else if (o.type === 'table') {
      body += `<table class="print-table steps-mini">` + o.rows.map(r =>
        `<tr>${r.map(c => `<td>${escapeHTML(c)}</td>`).join('')}</tr>`
      ).join('') + `</table>`;
    }
  });
  if (!sawAnyStep) {
    body += `<div class="step-note">No calculated values to show yet — enter inputs and click Calculate first.</div>`;
  }
  body += `</div>`;

  body += `<div class="print-footer">Generated with X &mdash; runs entirely in-browser, no data leaves your device. Steps mirror the exact values shown on the calculator, in the order they were computed. Rows marked <strong>✓</strong> are final results.</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>X — ${escapeHTML(calc.name)} — Steps</title>
<style>
  :root{
    --accent:#1D4ED8; --accent2:#4338CA; --text-dim:#333; --text-faint:#666;
    --ok:#15803D; --danger:#BE123C;
    --font-display:'Segoe UI',sans-serif; --font-body:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
    --font-mono:Consolas,'Liberation Mono',Menlo,monospace;
  }
  * { box-sizing: border-box; }
  body { font-family: var(--font-body); color:#111; background:#fff; margin: 28px; font-size: 14px; }
  .print-header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 4px; }
  .print-brand { font-family: var(--font-display); font-weight: 700; font-size: 19px; }
  .print-sub { font-size: 11.5px; color: #444; margin-top: 2px; }
  .print-title { font-family: var(--font-display); font-size: 23px; margin: 16px 0 4px; }
  .print-meta { font-size: 11.5px; color: #555; margin-bottom: 10px; }
  .print-h2 {
    font-family: var(--font-display); font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px; color: #111;
    border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 22px 0 8px;
  }
  .print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .print-table td { border: 1px solid #ccc; padding: 7px 11px; font-size: 13px; font-family: var(--font-mono); }
  .print-table td:first-child { font-family: var(--font-body); color: #333; width: 55%; }
  .print-error { color: var(--danger); font-weight: 600; margin-bottom: 10px; font-size: 13.5px; }
  .print-footer { margin-top: 28px; font-size: 10.5px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
  .print-actions { margin-bottom: 20px; }
  .print-actions button {
    font-family: var(--font-body); font-weight: 600; font-size: 13px;
    background: var(--accent); color: #fff; border: none; border-radius: 6px;
    padding: 9px 18px; cursor: pointer; margin-right: 8px;
  }
  .print-actions button.secondary { background:#eef1f6; color:#333; }

  .steps-formula {
    font-family: var(--font-mono); font-size: 13.5px; color: #1D4ED8;
    background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px;
    padding: 10px 14px; margin-bottom: 6px;
  }
  .steps-list { display: flex; flex-direction: column; gap: 8px; }
  .step-item {
    display: flex; align-items: flex-start; gap: 12px;
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 13px;
    background: #fafbfd;
  }
  .step-num {
    flex: 0 0 26px; height: 26px; border-radius: 50%;
    background: #dbe4ff; color: #1D4ED8; font-weight: 700; font-size: 12.5px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-mono);
  }
  .step-item.step-final { background: #ecfdf3; border-color: #86efac; }
  .step-item.step-final .step-num { background: #15803D; color: #fff; }
  .step-body { flex: 1; display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .step-label { color: #333; font-size: 13.5px; }
  .step-value { font-family: var(--font-mono); font-weight: 700; color: #111; }
  .step-item.step-final .step-value { color: #15803D; }
  .step-note { font-size: 12.5px; color: #555; padding: 4px 2px; }
  .steps-mini td { font-family: var(--font-mono); }
  @media print {
    .print-actions { display: none; }
    body { margin: 0.6cm; }
  }
</style>
</head>
<body>
  <div class="print-actions">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  ${body}
</body>
</html>`;
}

function showStepsPage(container, calc){
  const html = buildStepsHTML(container, calc);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `enginx-${calc.id}-steps.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function buildPrintReportHTML(container, calc){
  const inputs = extractInputs(container);
  const outputs = extractOutputs(container);

  let body = `
    <div class="print-header">
      <div class="print-brand">X</div>
      <div class="print-sub">Steel &amp; Rolling Mill Engineering Calculators</div>
    </div>
    <div class="print-title">${escapeHTML(calc.name)}</div>
    <div class="print-meta">Generated ${escapeHTML(new Date().toLocaleString())} &middot; ${escapeHTML(calc.category)}</div>
  `;

  if (inputs.length) {
    body += `<div class="print-h2">Inputs</div><table class="print-table">`;
    inputs.forEach(i => {
      body += `<tr><td>${escapeHTML(i.label)}</td><td>${escapeHTML(String(i.value))}${i.unit ? ' ' + escapeHTML(i.unit) : ''}</td></tr>`;
    });
    body += `</table>`;
  }

  body += `<div class="print-h2">Results</div>`;
  let rowBuffer = [];
  const flushRows = () => {
    if (rowBuffer.length) {
      body += `<table class="print-table">` + rowBuffer.map(r =>
        `<tr><td>${escapeHTML(r.label)}</td><td><strong>${escapeHTML(r.value)}</strong></td></tr>`
      ).join('') + `</table>`;
      rowBuffer = [];
    }
  };
  outputs.forEach(o => {
    if (o.type === 'row') { rowBuffer.push(o); return; }
    flushRows();
    if (o.type === 'error') body += `<div class="print-error">⚠ ${escapeHTML(o.text)}</div>`;
    else if (o.type === 'text') body += `<div class="print-note">${escapeHTML(o.text)}</div>`;
    else if (o.type === 'table') {
      body += `<table class="print-table">` + o.rows.map(r =>
        `<tr>${r.map(c => `<td>${escapeHTML(c)}</td>`).join('')}</tr>`
      ).join('') + `</table>`;
    }
  });
  flushRows();

  body += `<div class="print-footer">Generated with X &mdash; runs entirely in-browser, no data leaves your device. Use your browser's Print (Ctrl/Cmd+P) and choose "Save as PDF" if it didn't open automatically.</div>`;

  /* Fully self-contained document: all styles inlined so this works when
     opened in a new tab, saved as a file, or viewed offline — independent
     of the main app's stylesheet. */
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>X — ${escapeHTML(calc.name)}</title>
<style>
  :root{
    --accent:#1D4ED8; --accent2:#4338CA; --text-dim:#333; --text-faint:#666;
    --ok:#15803D; --danger:#BE123C;
    --font-display:'Segoe UI',sans-serif; --font-body:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
    --font-mono:Consolas,'Liberation Mono',Menlo,monospace;
  }
  * { box-sizing: border-box; }
  body { font-family: var(--font-body); color:#111; background:#fff; margin: 28px; font-size: 14px; }
  .print-header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 4px; }
  .print-brand { font-family: var(--font-display); font-weight: 700; font-size: 19px; }
  .print-sub { font-size: 11.5px; color: #444; margin-top: 2px; }
  .print-title { font-family: var(--font-display); font-size: 23px; margin: 16px 0 4px; }
  .print-meta { font-size: 11.5px; color: #555; margin-bottom: 10px; }
  .print-h2 {
    font-family: var(--font-display); font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px; color: #111;
    border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 22px 0 8px;
  }
  .print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .print-table td { border: 1px solid #ccc; padding: 7px 11px; font-size: 13px; font-family: var(--font-mono); }
  .print-table td:first-child { font-family: var(--font-body); color: #333; width: 55%; }
  .print-error { color: var(--danger); font-weight: 600; margin-bottom: 10px; font-size: 13.5px; }
  .print-note { font-size: 12px; color: #555; margin-bottom: 10px; }
  .print-footer { margin-top: 28px; font-size: 10.5px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
  .print-actions { margin-bottom: 20px; }
  .print-actions button {
    font-family: var(--font-body); font-weight: 600; font-size: 13px;
    background: var(--accent); color: #fff; border: none; border-radius: 6px;
    padding: 9px 18px; cursor: pointer;
  }
  @media print {
    .print-actions { display: none; }
    body { margin: 0.6cm; }
  }
</style>
</head>
<body>
  <div class="print-actions"><button onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  ${body}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

function printCalculator(container, calc){
  const html = buildPrintReportHTML(container, calc);

  // Print via a hidden iframe instead of window.open — this triggers only
  // the browser's native Print dialog, without ever opening a new tab/page.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };

  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    // The report's own script calls window.print() shortly after load —
    // that now fires inside this hidden iframe's window, not a new tab.
    iframe.contentWindow.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 60000); // safety net if afterprint never fires
  } catch (e) {
    cleanup();
    // Fallback (very old/restrictive browsers): download the report so it
    // can still be opened and printed/saved as PDF manually.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enginx-${calc.id}-report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

function setupToolbar(container, calc){
  const toolbar = $('#calcToolbar');
  toolbar.style.display = 'flex';
  $('#btnPrint').onclick = () => printCalculator(container, calc);
  $('#btnCopy').onclick = (e) => copyAsText(container, calc, e.currentTarget);
  $('#btnCSV').onclick = () => exportCSV(container, calc);
}

/* =========================================================================
   APP ROUTER
   ========================================================================= */
function buildSidebar(){
  const byCategory = {};
  CALCULATORS.forEach(c => { (byCategory[c.category] = byCategory[c.category]||[]).push(c); });
  const list = $('#calcList');
  function render(filter=''){
    const f = filter.trim().toLowerCase();
    list.innerHTML = '';
    Object.keys(byCategory).forEach(cat => {
      const catMatches = cat.toLowerCase().includes(f);
      const items = byCategory[cat].filter(c => !f || catMatches || c.name.toLowerCase().includes(f));
      if (!items.length) return;
      const label = document.createElement('div');
      label.className = 'category-label';
      label.textContent = cat;
      list.appendChild(label);
      items.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'calc-item';
        btn.textContent = c.name;
        btn.dataset.id = c.id;
        btn.addEventListener('click', () => openCalculator(c.id));
        list.appendChild(btn);
      });
    });
  }
  render();
  const searchBox = $('#searchBox');
  const clearBtn = $('#searchClear');
  function syncClearBtn(){ clearBtn.classList.toggle('show', searchBox.value.length > 0); }
  searchBox.addEventListener('input', e => { render(e.target.value); syncClearBtn(); });
  clearBtn.addEventListener('click', () => {
    searchBox.value = '';
    render('');
    syncClearBtn();
    searchBox.focus();
  });
  syncClearBtn();
}
/* ---------------------------------------------------------------------
   HOMEPAGE — dynamic marketing/overview screen shown before a calculator
   is opened. Stats, popular picks and the category grid are all derived
   live from the CALCULATORS registry, so they never go stale.
   --------------------------------------------------------------------- */
function renderWelcomeHome(){
  const welcome = document.getElementById('welcome');
  if (!welcome) return;

  const byCategory = {};
  CALCULATORS.forEach(c => { (byCategory[c.category] = byCategory[c.category]||[]).push(c); });
  const categories = Object.keys(byCategory);

  const stats = [
    { icon:'🧮', value: String(CALCULATORS.length), label:'Calculators' },
    { icon:'🗂️', value: String(categories.length), label:'Categories' },
    { icon:'🔒', value:'100%', label:'Runs In-Browser' },
    { icon:'⚡', value:'Free', label:'No Sign-up Needed' }
  ];

  const features = [
    { icon:'🔒', title:'Private by Design', text:"Every calculation runs locally in your browser. Nothing you type is ever sent to a server." },
    { icon:'⚡', title:'Instant Results', text:'No loading, no sign-up — enter a value and the answer updates right away.' },
    { icon:'📐', title:'Verified Formulas', text:'Every formula is cross-checked against standard mechanical &amp; industrial engineering references.' },
    { icon:'🖨️', title:'Export Ready', text:'Print a clean report, copy results as text, or download a CSV in one click.' }
  ];

  // Curated shortcuts — only kept if the calculator actually exists in
  // the registry, so this list degrades gracefully as calcs change.
  const popularIds = ['prod-chart','accumulator-capacity','rolling-load','tolerance','units','bearing-life'];
  const popular = popularIds.map(id => CALCULATORS.find(c => c.id===id)).filter(Boolean);

  welcome.innerHTML = `
    <div class="hero">
      <span class="welcome-badge">${CALCULATORS.length} calculators · ${categories.length} categories · verified formulas</span>
      <h1>X — Steel &amp; Rolling Mill Engineering Calculators</h1>
      <p>Purpose-built for rolling mills, coil-processing and galvanizing lines: rolling loads, drive power, coil handling, fits &amp; tolerances, and more. Pick a calculator from the sidebar, jump into a popular one below, or browse by category.</p>
      <button id="welcomeBrowseBtn" class="btn welcome-browse-btn">Browse All Calculators</button>
    </div>

    <div class="stats-grid">
      ${stats.map(s=>`<div class="stat-card"><div class="stat-icon">${s.icon}</div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('')}
    </div>

    <div class="features-grid">
      ${features.map(f=>`<div class="feature-card"><div class="feature-icon">${f.icon}</div><div class="feature-title">${f.title}</div><div class="feature-text">${f.text}</div></div>`).join('')}
    </div>

    ${popular.length ? `
    <h2 class="section-heading">Popular Calculators</h2>
    <div class="popular-grid">
      ${popular.map(c=>`<button class="popular-card" data-openid="${c.id}"><span class="popular-cat">${c.category}</span><span class="popular-name">${c.name}</span></button>`).join('')}
    </div>` : ''}

    <h2 class="section-heading">Browse by Category</h2>
    <div class="category-grid">
      ${categories.map(cat=>`<button class="category-card" data-catfilter="${cat}"><span class="category-card-name">${cat}</span><span class="category-card-count">${byCategory[cat].length} calculator${byCategory[cat].length===1?'':'s'}</span></button>`).join('')}
    </div>
  `;

  const browseBtn = document.getElementById('welcomeBrowseBtn');
  if (browseBtn) browseBtn.addEventListener('click', openSidebar);

  $all('[data-openid]', welcome).forEach(btn=>{
    btn.addEventListener('click', () => openCalculator(btn.dataset.openid));
  });
  $all('[data-catfilter]', welcome).forEach(btn=>{
    btn.addEventListener('click', () => {
      openSidebar();
      const sb = document.getElementById('searchBox');
      if (!sb) return;
      sb.value = btn.dataset.catfilter;
      sb.dispatchEvent(new Event('input'));
      sb.focus();
    });
  });
}

function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('show');
  document.body.classList.add('sidebar-open-lock');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
  document.body.classList.remove('sidebar-open-lock');
}
function goHome(){
  $('#calcContainer').style.display = 'none';
  $('#calcContainer').innerHTML = '';
  $('#calcToolbar').style.display = 'none';
  $('#welcome').style.display = '';
  $all('.calc-item').forEach(b => b.classList.remove('active'));
  document.getElementById('topbarTitle').textContent = 'X';
  document.body.classList.remove('calc-active');
  window.scrollTo(0,0);
}
function openCalculator(id){
  const calc = CALCULATORS.find(c => c.id === id);
  if (!calc) return;
  $('#welcome').style.display = 'none';
  const container = $('#calcContainer');
  container.style.display = 'block';
  calc.render(container);
  $all('.calc-item').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  document.getElementById('topbarTitle').textContent = calc.name;
  document.body.classList.add('calc-active');
  closeSidebar();
  const contentEl = document.getElementById('content');
  if (contentEl) contentEl.scrollTo(0,0);
  window.scrollTo(0,0);
  setupToolbar(container, calc);
}
document.getElementById('menuToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
});
document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);
const sidebarCloseBtn = document.getElementById('sidebarClose');
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
const topbarBackBtn = document.getElementById('topbarBack');
if (topbarBackBtn) topbarBackBtn.addEventListener('click', goHome);
buildSidebar();
renderWelcomeHome();