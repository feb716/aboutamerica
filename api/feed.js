// File: api/feed.js

const Parser = require('rss-parser');
const parser = new Parser({
    headers: { 'User-Agent': 'Custom RSS Aggregator' }
});

// URl RSS Feeds anu anjeun hoyong agregat
const RSS_FEEDS = [
    { title: 'Fox News - Popular', url: 'https://feeds.foxnews.com/foxnews/most-popular' },
    { title: 'TMZ (Entertainment)', url: 'https://www.tmz.com/rss.xml' },
    { title: 'NBA News', url: 'https://www.nba.com/rss/nba_latest_news.rss' }
];

module.exports = async (req, res) => {
    
    let allItems = [];
    const siteTitle = 'Agregator Berita Otomatis Gratis';
    
    // Looping pikeun ngumpulkeun data tina sadaya Feed
    for (const feedConfig of RSS_FEEDS) {
        try {
            const feed = await parser.parseURL(feedConfig.url);
            
            // Tambihkeun 5 item terbaru tina unggal feed, tambihkeun label sumber
            const itemsToAdd = feed.items.slice(0, 5).map(item => ({
                ...item,
                source: feedConfig.title
            }));
            
            allItems.push(...itemsToAdd);
        } catch (error) {
            console.error(`Gagal memuat feed: ${feedConfig.title}`);
            // Lanjut ka feed salajengna
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
                .item { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                .item h3 a { color: #0056b3; text-decoration: none; }
                .source { font-size: 0.9em; color: #555; margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>${siteTitle}</h1>
            <p>Diperbarui otomatis ti ${RSS_FEEDS.length} sumber.</p>
            <p>Postingan di-cache 1 jam (cadangan aman 24 jam).</p>
    `;

    // Looping pikeun nembongkeun sadaya konten
    if (allItems.length === 0) {
        htmlContent += '<p>Saat ini tidak ada berita yang dapat dimuat.</p>';
    } else {
        allItems.forEach(item => {
            htmlContent += `
                <div class="item">
                    <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                    <div class="source">
                        Sumber: <strong>${item.source}</strong> | 
                        Dipublikasikan: ${new Date(item.isoDate).toLocaleString('id-ID')}
                    </div>
                </div>
            `;
        });
    }

    // BARIS TAMBAHAN UNTUK SPEED INSIGHTS!
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
