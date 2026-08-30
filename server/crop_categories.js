import sharp from 'sharp';
import path from 'path';

const imgPath = 'C:/Users/System2/.gemini/antigravity-ide/brain/350db8f4-ecfd-41d9-abb3-7a6dc20dff54/media__1786008974287.png';
const outDir = 'd:/monday 03.08/client/public';

async function cropAll() {
  const cellWidth = 102.4;
  const cellHeight = 139;

  const categories = [
    // Row 1
    { name: 'restaurants', col: 0, row: 0 },
    { name: 'hospitals', col: 1, row: 0 },
    { name: 'education', col: 2, row: 0 },
    { name: 'hotels', col: 3, row: 0 },
    { name: 'theatres', col: 4, row: 0 },
    { name: 'banks', col: 5, row: 0 },
    { name: 'auditors', col: 6, row: 0 },
    { name: 'cafes', col: 7, row: 0 },
    { name: 'dentists', col: 8, row: 0 },
    { name: 'temples', col: 9, row: 0 },
    // Row 2
    { name: 'gym', col: 0, row: 1 },
    { name: 'loans', col: 1, row: 1 },
    { name: 'contractors', col: 2, row: 1 },
    { name: 'pharmacies', col: 3, row: 1 },
    { name: 'event_organisers', col: 4, row: 1 },
    { name: 'beauty_spa', col: 5, row: 1 },
    { name: 'home_decor', col: 6, row: 1 },
    { name: 'wedding_planning', col: 7, row: 1 },
    { name: 'rent_hire', col: 8, row: 1 },
    { name: 'pet_shops', col: 9, row: 1 }
  ];

  for (const cat of categories) {
    const left = Math.round(cat.col * cellWidth);
    const top = Math.round(cat.row * cellHeight);
    
    const width = Math.round(cellWidth);
    const height = Math.round(cellHeight - 35); // exclude bottom 35px text area

    try {
      await sharp(imgPath)
        .extract({ left, top, width, height })
        .trim({ threshold: 10 }) // trim white borders
        .toFile(path.join(outDir, `cat-${cat.name}.png`));
      console.log(`Successfully cropped ${cat.name}`);
    } catch (e) {
      console.error(`Failed to crop ${cat.name}:`, e);
    }
  }
}

cropAll();
