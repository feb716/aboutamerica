// File: api/feed.js

const Parser = require('rss-parser');
const parser = new Parser({
    customFields: {
        item: ['media:content', 'enclosure', 'content:encoded', 'description'] 
    },
    headers: { 'User-Agent': 'Custom US News Aggregator Bot' }
});

const RSS_FEEDS = [
    { title: 'Fox News - Paling Populer (US)', url: 'https://feeds.foxnews.com/foxnews/most-popular' },
    { title: 'The New York Times - Berita Utama', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' } 
];

function findImage(item) {
    if (item['media:content'] && item['media:content']['$'] && item['media:content']['$].url) {
        return item['media:content']['$'].url;
    }
    if (item.enclosure && item.enclosure.url) {
        return item.enclosure.url;
    }
    const contentToSearch = item['content:encoded'] || item.content || item.description || '';
    if (contentToSearch) {
        const imgMatch = contentToSearch.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            return imgMatch[1];
        }
    }
    return null;
}


module.exports = async (req, res) => {
    
    let allItems = [];
    const siteTitle = 'US News Aggregator: Fox & NYT';
    
    for (const feedConfig of RSS_FEEDS) {
        try {
            const feed = await parser.parseURL(feedConfig.url);
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

    allItems.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

    // Nyiapkeun Konten HTML
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${siteTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Roboto', sans-serif; 
                    background-color: #f4f7f9; 
                    color: #333;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px;
                    padding-bottom: 80px; 
                    background-color: #fff;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                header {
                    background-color: #004d99; 
                    color: white;
                    padding: 20px 0;
                    margin-bottom: 20px;
                    text-align: center;
                }
                header h1 {
                    margin: 0;
                    font-size: 2.5em;
                    font-weight: 700;
                }
                .item { 
                    border: 1px solid #e0e0e0; 
                    padding: 15px; 
                    margin-bottom: 25px; 
                    border-radius: 8px; 
                    display: flex; 
                    gap: 15px; 
                    background-color: #ffffff;
                    transition: box-shadow 0.3s ease;
                }
                .item:hover {
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                .item h3 { margin-top: 0; }
                .item h3 a { 
                    color: #004d99; 
                    text-decoration: none; 
                    font-weight: 700;
                    /* --- PERBAIKAN FONT JUDUL DI IEU BARIS! --- */
                    font-size: 1.0em; /* Leuwih leutik ti 1.1em sateuacana */
                    /* ------------------------------------------- */
                }
                .item h3 a:hover {
                    text-decoration: underline;
                }
                .source { 
                    font-size: 0.85em; 
                    color: #777; 
                    margin-top: 8px; 
                }
                .image-container { 
                    flex-shrink: 0; 
                    width: 140px; 
                    height: 90px;
                }
                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; 
                    border-radius: 5px;
                }
                .text-content {
                    flex-grow: 1;
                }
                .ad-slot-placeholder {
                    text-align: center;
                    margin: 30px 0;
                }
                footer {
                    text-align: center;
                    padding: 20px 0;
                    margin-top: 30px;
                    border-top: 1px solid #ccc;
                    font-size: 0.8em;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <header>
                <h1>${siteTitle}</h1>
            </header>
            <div class="container">
                
                <div class="ad-slot-placeholder">
                    </div>
                `;

    // Looping pikeun nembongkeun sadaya konten
    if (allItems.length === 0) {
        htmlContent += '<p>Saat ini tidak ada berita yang dapat dimuat.</p>';
    } else {
        allItems.forEach((item, index) => {
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
            
            if (index === 4) {
                 htmlContent += `
                    <div class="ad-slot-placeholder">
                        </div>
                    `;
            }
        });
    }

    // Tutup Div Container jeung Tambahkeun Footer
    htmlContent += `
            </div> 
            <footer>
                &copy; ${new Date().getFullYear()} ${siteTitle}. Sumber berita disayogikeun ku Fox News sareng The New York Times.
            </footer>
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
