// File: api/feed.js

const Parser = require('rss-parser');
const parser = new Parser({
    // Setel parser pikeun ngolah namespace gambar média
    customFields: {
        item: ['media:content', 'enclosure', 'content:encoded', 'description'] 
    },
    headers: { 'User-Agent': 'Custom US News Aggregator Bot' }
});

// DAPTAR SUMBER BERITA US AYEUNA (HANYA NU STABIL GAMBARNA)
const RSS_FEEDS = [
    { title: 'Fox News - Paling Populer (US)', url: 'https://feeds.foxnews.com/foxnews/most-popular' },
    { title: 'The New York Times - Berita Utama', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' } 
];

// FUNGSI: Nyobaan milarian link gambar
function findImage(item) {
    // 1. Coba dina tag media:content
    if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
        return item['media:content']['$'].url;
    }
    // 2. Coba dina tag enclosure
    if (item.enclosure && item.enclosure.url) {
        return item.enclosure.url;
    }
    
    // 3. Coba tina deskripsi ATAWA content:encoded (nyari tag <img>)
    const contentToSearch = item['content:encoded'] || item.content || item.description || '';
    
    if (contentToSearch) {
        // Pake regex pikeun nyari tag <img>
        const imgMatch = contentToSearch.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            return imgMatch[1];
        }
    }
    
    return null; // Upami teu aya gambar anu kapanggih
}


module.exports = async (req, res) => {
    
    let allItems = [];
    const siteTitle = 'Agregator Berita Utama US';
    
    // Looping pikeun ngumpulkeun data tina sadaya Feed
    for (const feedConfig of RSS_FEEDS) {
        try {
            const feed = await parser.parseURL(feedConfig.url);
            
            // Tambihkeun 10 item terbaru tina unggal feed (Maksimal 20 total)
            const itemsToAdd = feed.items.slice(0, 10).map(item => ({
                ...item,
                source: feedConfig.title,
                imageUrl: findImage(item) 
            }));
            
            allItems.push(...itemsToAdd);
        } catch (error) {
            console.error(`Gagal memuat feed: ${feedConfig.title}`);
        }
    }

    // Sortir sadaya item dumasar tanggal terbaru
    allItems.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

    // Ngadamel Tampilan HTML
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${siteTitle}</title>
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
                .item { 
                    border: 1px solid #ddd; 
                    padding: 15px; 
                    margin-bottom: 20px; 
                    border-radius: 5px; 
                    display: flex; 
                    gap: 15px; 
                }
                .item h3 a { color: #0056b3; text-decoration: none; }
                .source { font-size: 0.9em; color: #555; margin-top: 5px; }
                .image-container { 
                    flex-shrink: 0; 
                    width: 120px; 
                    height: 80px;
                }
                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; 
                    border-radius: 3px;
                }
                .text-content {
                    flex-grow: 1;
                }
            </style>
        </head>
        <body>
            <h1>${siteTitle}</h1>
            <p>Diperbarui otomatis ti ${RSS_FEEDS.length} sumber anu stabil gambarna.</p>
            <p>Postingan di-cache 1 jam (cadangan aman 24 jam).</p>
    `;

    // Looping pikeun nembongkeun sadaya konten
    if (allItems.length === 0) {
        htmlContent += '<p>Saat ini tidak ada berita yang dapat dimuat.</p>';
    } else {
        allItems.forEach(item => {
            // Nyiapkeun tag gambar upami link kapanggih
            const imageHtml = item.imageUrl 
                ? `<div class="image-container"><img src="${item.imageUrl}" alt="${item.title}" loading="lazy"></div>` 
                : ''; 
            
            htmlContent += `
                <div class="item">
                    ${imageHtml}
                    <div class="text-content">
                        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                        <div class="source">
                            Sumber: <strong>${item.source}</strong> | 
                            Dipublikasikan: ${new Date(item.isoDate).toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // Skrip Vercel Speed Insights 
    htmlContent += `
            <script src="/_vercel/insights/script.js" defer></script> 
        </body>
        </html>
    `;

    // Ngatur Header Cache Vercel
    const CACHE_HEADER = 'public, s-maxage=3600, stale-while-revalidate=86400';

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
};
