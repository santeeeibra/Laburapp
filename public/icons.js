function jobIcon(category){const paths={
'Hogar y limpieza':'<path d="m5 20 5-11 5 2-5 11M10 9l4-7m-7 13 5 2M16 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
'Construcción y oficios':'<path d="m14 6 4 4M5 21l9-9m-8 0L3 9l6-6 3 3m-5 7 4 4m3-14 7 7-4 4-7-7Z"/>',
'Jardinería':'<path d="M5 20C5 9 10 4 20 4c0 11-5 16-15 16Zm0 0L16 9M9 14v-4m4 0h4"/>',
'Mudanzas':'<path d="m3 7 9-4 9 4v11l-9 4-9-4Zm0 0 9 4 9-4M12 11v11M7 5l9 4M6 14l3 1"/>',
'Gastronomía':'<path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M18 21v-8h3V3c-5 0-6 6-3 10"/>',
'Comercio':'<path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 3 5 3 5 0 0 3 5 3 5 0 0 3 8 3 8 0M9 21v-7h6v7"/>',
'Tecnología':'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-7-8h14"/>',
'Mascotas':'<ellipse cx="12" cy="16" rx="5" ry="4"/><ellipse cx="5" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="10" rx="2" ry="3"/>',
'Cuidado y acompañamiento':'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 2 10 8 15 6-5 12-11 8-15Z"/>',
'Servicios creativos':'<path d="m4 20 2-7L17 2l5 5-11 11-7 2Zm2-7 5 5M14 5l5 5"/>',
'Otros':'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[category]||paths.Otros}</svg>`}
