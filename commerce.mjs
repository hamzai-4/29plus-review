// Prices are integer fils. Only known, available catalogue variants can check out.
export function cleanCart(value, products) {
  if (!Array.isArray(value)) return [];
  const known = new Map(products.filter(p => p.available).map(p => [p.handle, p]));
  const merged = new Map();
  for (const row of value) {
    if (!row || !known.has(row.handle) || !Number.isInteger(row.quantity) || row.quantity < 1) continue;
    merged.set(row.handle, Math.min(20, (merged.get(row.handle) || 0) + row.quantity));
  }
  return [...merged].map(([handle, quantity]) => ({handle, quantity}));
}
export function totalCart(cart, products) {
  const known = new Map(products.map(p => [p.handle, p]));
  return cleanCart(cart, products).reduce((total, row) => total + known.get(row.handle).price * row.quantity, 0);
}
export function checkoutUrl(cart, products) {
  const known = new Map(products.map(p => [p.handle, p]));
  const rows = cleanCart(cart, products);
  if (!rows.length) return null;
  return 'https://29plus.com/cart/' + rows.map(row => `${known.get(row.handle).variant}:${row.quantity}`).join(',');
}
export function recommend(answers, products) {
 const range=answers.skin==='dry'?'ultra-rich':'rich';
 const selected=Array.isArray(answers.focus)?answers.focus:[answers.focus];
 const focus=['hydration','texture','eyes'].filter(f=>selected.includes(f)||selected.includes('all'));
 if(!focus.length)focus.push('hydration');
 const existing=['serum','cream'].includes(answers.existing)?answers.existing:'none';
 const handles=[];
 if(focus.includes('eyes'))handles.push('eye-serum');
 if(focus.includes('texture')&&existing!=='serum')handles.push(range+'-serum');
 if(focus.includes('hydration')&&existing!=='cream')handles.push(range+'-cream');
 // Complement a step already owned instead of recommending a duplicate.
 if(!handles.length)handles.push(range+(existing==='cream'?'-serum':'-cream'));
 const items=handles.map(h=>products.find(p=>p.handle===h&&!p.refill&&p.available)).filter(Boolean);
 const needs=focus.map(f=>({hydration:'moisture and comfort',texture:'smoother-looking skin',eyes:'a refreshed eye contour'}[f])).join(', ');
 const texture=answers.skin==='dry'?'The ULTRA RICH face formulas suit your preference for richer textures.':answers.skin==='combo'?'The RICH face formulas suit your preference for lighter textures.':'The RICH face formulas offer a lighter starting point while you explore your preferences.';
 const owned=existing==='none'?'Each suggested product has a role in the concerns you selected.':`You already have a face ${existing}, so we have focused on complementary care rather than replacing that step.`;
 const reason=`Your priorities are ${needs}. ${owned} ${handles.some(h=>h!=='eye-serum')?texture:'EYE SERUM is the same light eye formula in both skincare ranges.'}`+(items.length<handles.length?' Some suggested products are currently unavailable.':'');
 return {items,reason,total:items.reduce((sum,p)=>sum+p.price,0)};
}
