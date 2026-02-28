const fs = require('fs');
let e = fs.readFileSync('./src/pages/Eleves.js', 'utf8');

e = e.replace(
  `                    <div style={s.field}><label style={s.lbl}>D — REF</label><input style={{...s.inp,background:'#f8fafc'}} readOnly value={eleveEdit?.oasi_ref||''} /></div>
                    <div style={s.field}><label style={s.lbl}>E — POS</label><input style={{...s.inp,background:'#f8fafc'}} readOnly value={eleveEdit?.oasi_pos||''} /></div>
                    <div style={s.field}><label style={s.lbl}>H — NATIONALITE</label>`,
  `                    <div style={s.field}><label style={s.lbl}>D — REF</label><input style={{...s.inp,background:'#f8fafc'}} readOnly value={eleveEdit?.oasi_ref||''} /></div>
                    <div style={s.field}><label style={s.lbl}>E — POS</label><input style={{...s.inp,background:'#f8fafc'}} readOnly value={eleveEdit?.oasi_pos||''} /></div>
                    <div style={s.field}><label style={s.lbl}>F — NOM</label><input style={{...s.inp,background:'#f8fafc'}} readOnly value={eleveEdit?.oasi_nom||''} /></div>
                    <div style={s.field}><label style={s.lbl}>G — NAIS</label><input style={{...s.inp,background:'#f8fafc'}} readOnly value={eleveEdit?.oasi_nais?.substring(0,10)||''} /></div>
                    <div style={s.field}><label style={s.lbl}>H — NATIONALITE</label>`
);

fs.writeFileSync('./src/pages/Eleves.js', e);
console.log('F et G OK !');