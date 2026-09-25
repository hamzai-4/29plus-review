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
  const skin = ['combo','dry','unsure'].includes(answers.skin) ? answers.skin : 'unsure';
  const focus = ['hydration','texture','eyes'].includes(answers.focus) ? answers.focus : 'hydration';
  const approach = ['start','pair','complete'].includes(answers.approach) ? answers.approach : 'start';
  const range = skin === 'dry' ? 'ultra-rich' : 'rich';
  const serum = range + '-serum', cream = range + '-cream';
  const choices = {
    hydration: {start:[cream], pair:[cream,'eye-serum'], complete:[range+'-set']},
    texture: {start:[serum], pair:[serum,cream], complete:[range+'-set']},
    eyes: {start:['eye-serum'], pair:['eye-serum',cream], complete:[range+'-set']}
  };
  const handles = choices[focus][approach];
  const items = handles.map(h => products.find(p => p.handle === h && !p.refill && p.available)).filter(Boolean);
  const texture = {
    combo: 'You described shiny or combination skin, so your face products come from the lighter Rich range.',
    dry: 'You described dry skin and a preference for comfort, so your face products come from the cushioning Ultra Rich range.',
    unsure: 'You chose balanced or hard-to-describe skin. Rich is a lighter-texture starting point to explore, rather than a skin-type assessment.'
  };
  const reasons = {
    hydration: {
      start: 'Start with your matching face cream to focus on moisture and comfort.',
      pair: 'Your face cream focuses on moisture and comfort, paired with Eye Serum for a dedicated hydrating eye step.',
      complete: 'Your complete set brings Eye Serum, face serum and face cream together, with the cream as your moisture-and-comfort anchor.'
    },
    texture: {
      start: 'Start with your matching face serum, the peptide-focused step for smoother-looking skin and the appearance of fine lines.',
      pair: 'Pair your face serum with its matching cream: a peptide-focused step followed by moisture for a comfortable finish.',
      complete: 'Your complete set brings Eye Serum, face serum and face cream together, with the face serum as your texture-focused step.'
    },
    eyes: {
      start: 'Start with Eye Serum for your priority: a refreshed-looking eye contour and the appearance of dark circles and puffiness.',
      pair: 'Keep Eye Serum as your targeted priority and add your matching face cream for a simple eye-and-face pairing.',
      complete: 'Your complete set keeps Eye Serum as your priority while adding the matching face serum and cream for the rest of your ritual.'
    }
  };
  let reason = reasons[focus][approach] + ' ' + (focus === 'eyes' && approach === 'start'
    ? ({combo:'Although you prefer lighter face textures,',dry:'Although you prefer richer face textures,',unsure:'Even if you are still exploring your skin preferences,'}[skin] + ' Eye Serum is the same light eye formula in both ranges.')
    : texture[skin]);
  if (items.length !== handles.length) reason += ' Part of this recommendation is currently unavailable; only available products are shown.';
  return {items, reason, total: items.reduce((sum,p) => sum+p.price,0)};
}
